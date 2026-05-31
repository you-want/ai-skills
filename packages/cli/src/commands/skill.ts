import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface AddOptions {
  local?: boolean
  branch?: string
}

interface SkillMetadata {
  name?: string
  version?: string
  description?: string
  author?: string
  tags?: string[]
  dependencies?: string[]
  install?: string[]
}

export interface RegistryEntry {
  repo: string
  branch: string
  installedAt: string
  version?: string
  path: string
  description?: string
  tags?: string[]
  author?: string
  isLocal?: boolean
}

export interface Registry {
  [skillName: string]: RegistryEntry
}

const GLOBAL_SKILLS_DIR = path.join(os.homedir(), '.ai-skills', 'skills')
const REGISTRY_PATH = path.join(os.homedir(), '.ai-skills', 'registry.json')
const LOCAL_SKILLS_DIR = '.ai-skills'
const LOCAL_SKILLS_SUBDIR = 'skills'

interface RepoInfo {
  repoUrl: string
  skillName: string
  branch: string
  isLocalPath: boolean
}

function parseRepoInput(input: string): RepoInfo {
  let repoUrl: string
  let branch = 'main'
  let skillName: string
  let isLocalPath = false

  if (input.startsWith('/') || input.startsWith('./') || input.startsWith('../')) {
    repoUrl = input
    const parts = input.split('#')
    if (parts[1]) branch = parts[1]
    const cleanPath = parts[0].replace(/\/$/, '')
    skillName = cleanPath.split('/').pop() || 'skill'
    isLocalPath = true
  } else if (input.includes('/') && !input.startsWith('http') && !input.startsWith('git@')) {
    const parts = input.split('#')
    const repoPart = parts[0]
    if (parts[1]) branch = parts[1]

    repoUrl = `https://github.com/${repoPart}.git`
    skillName = repoPart.split('/').pop()!
  } else if (input.startsWith('http://') || input.startsWith('https://')) {
    repoUrl = input.endsWith('.git') ? input : `${input}.git`
    const urlParts = repoUrl.split('/')
    skillName = urlParts[urlParts.length - 1].replace('.git', '')
  } else if (input.startsWith('git@')) {
    repoUrl = input
    const match = input.match(/:(.+?)(?:\.git)?$/)
    skillName = match ? match[1].split('/').pop()! : 'unknown'
  } else {
    repoUrl = `https://github.com/${input}.git`
    const parts = input.split('#')
    if (parts[1]) branch = parts[1]
    skillName = parts[0].split('/').pop()!
  }

  return { repoUrl, skillName, branch, isLocalPath }
}

function getTargetDir(skillName: string, local?: boolean): string {
  if (local) {
    return path.join(process.cwd(), LOCAL_SKILLS_DIR, LOCAL_SKILLS_SUBDIR, skillName)
  }
  return path.join(GLOBAL_SKILLS_DIR, skillName)
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true })
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function loadRegistry(): Promise<Registry> {
  try {
    if (await pathExists(REGISTRY_PATH)) {
      const content = await fs.promises.readFile(REGISTRY_PATH, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // ignore
  }
  return {}
}

async function saveRegistry(registry: Registry): Promise<void> {
  await ensureDir(path.dirname(REGISTRY_PATH))
  await fs.promises.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8')
}

function parseYAMLFrontmatter(content: string): SkillMetadata {
  const frontmatterStart = content.indexOf('---')
  const frontmatterEnd = content.indexOf('---', frontmatterStart + 3)
  
  if (frontmatterStart !== 0 || frontmatterEnd === -1) {
    return {}
  }
  
  const frontmatter = content.slice(frontmatterStart + 3, frontmatterEnd).trim()
  const metadata: SkillMetadata = {}
  
  const lines = frontmatter.split('\n')
  let listKey: string | null = null
  let listValues: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    if (trimmed.startsWith('-')) {
      if (listKey) {
        listValues.push(trimmed.slice(1).trim())
      }
    } else {
      if (listKey) {
        (metadata as any)[listKey] = listValues
        listKey = null
        listValues = []
      }
      
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > -1) {
        const key = trimmed.slice(0, colonIndex).trim()
        let value = trimmed.slice(colonIndex + 1).trim()
        
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            value = value.slice(1, -1)
            const values = value.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
            ;(metadata as any)[key] = values
          } catch {
            ;(metadata as any)[key] = value
          }
        } else if (value === '') {
          listKey = key
        } else {
          value = value.replace(/^["']|["']$/g, '')
          ;(metadata as any)[key] = value
        }
      }
    }
  }
  
  if (listKey) {
    (metadata as any)[listKey] = listValues
  }
  
  return metadata
}

async function extractSkillMetadata(skillDir: string): Promise<SkillMetadata> {
  const skillMdPath = path.join(skillDir, 'SKILL.md')
  try {
    if (await pathExists(skillMdPath)) {
      const content = await fs.promises.readFile(skillMdPath, 'utf-8')
      return parseYAMLFrontmatter(content)
    }
  } catch {
    // ignore
  }
  return {}
}

async function runInstallCommands(skillDir: string, commands: string[]): Promise<void> {
  if (!commands || commands.length === 0) return
  
  console.log('⚙️  执行 install 钩子...')
  
  for (const cmd of commands) {
    const parts = cmd.split(/\s+/)
    const command = parts[0]
    const args = parts.slice(1)
    
    try {
      console.log(`  $ ${cmd}`)
      await execFileAsync(command, args, { cwd: skillDir })
    } catch {
      console.warn(`  ⚠️  命令执行失败: ${cmd}`)
    }
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await ensureDir(dest)
  
  const entries = await fs.promises.readdir(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

async function cloneRepo(repoUrl: string, targetDir: string, branch: string): Promise<void> {
  try {
    await execFileAsync('git', ['clone', '--depth', '1', '--branch', branch, repoUrl, targetDir])
  } catch {
    if (branch === 'main') {
      try {
        await execFileAsync('git', ['clone', '--depth', '1', repoUrl, targetDir])
        return
      } catch {
        // fallback failed
      }
    }
    throw new Error(`克隆仓库失败: ${repoUrl}`)
  }
}

export async function addSkill(repoInput: string, options: AddOptions = {}): Promise<void> {
  const { repoUrl, skillName, branch, isLocalPath } = parseRepoInput(repoInput)
  
  // options.local 决定安装到本地还是全局目录
  // isLocalPath 决定数据来源（本地复制 vs 远程克隆）
  const installToLocal = options.local ?? false
  const targetDir = getTargetDir(skillName, installToLocal)
  const scope = installToLocal ? '本地' : '全局'

  console.log(`📦 开始安装技能 "${skillName}" (${scope})...`)

  if (await pathExists(targetDir)) {
    console.error(`❌ 技能 "${skillName}" 已存在`)
    console.error(`   路径: ${targetDir}`)
    console.error(`   请先使用 "ai-skills remove ${skillName}" 移除后再安装`)
    return
  }

  try {
    await ensureDir(path.dirname(targetDir))

    // 根据数据来源决定：本地路径复制 or 远程仓库克隆
    if (isLocalPath) {
      await copyDirectory(repoUrl, targetDir)
    } else {
      await cloneRepo(repoUrl, targetDir, branch)
    }

    const skillMdPath = path.join(targetDir, 'SKILL.md')
    if (!(await pathExists(skillMdPath))) {
      console.warn(`⚠️  警告: 技能 "${skillName}" 缺少 SKILL.md 文件`)
    }

    const metadata = await extractSkillMetadata(targetDir)

    if (metadata.install && metadata.install.length > 0) {
      await runInstallCommands(targetDir, metadata.install)
    }

    const registry = await loadRegistry()
    registry[skillName] = {
      repo: repoUrl,
      branch,
      installedAt: new Date().toISOString(),
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      tags: metadata.tags,
      isLocal: installToLocal,
      path: targetDir,
    }
    await saveRegistry(registry)

    console.log(`✅ 技能 "${skillName}" 安装完成!`)
    console.log(`   路径: ${targetDir}`)
    if (metadata.version) {
      console.log(`   版本: ${metadata.version}`)
    }
    if (metadata.description) {
      console.log(`   描述: ${metadata.description}`)
    }
  } catch (error) {
    console.error(`❌ 安装失败: ${error}`)
    if (await pathExists(targetDir)) {
      await fs.promises.rm(targetDir, { recursive: true, force: true })
    }
    throw error
  }
}

export async function removeSkill(skillName: string): Promise<void> {
  const registry = await loadRegistry()
  const entry = registry[skillName]

  if (!entry) {
    console.error(`❌ 技能 "${skillName}" 未安装`)
    return
  }

  const scope = entry.isLocal ? '本地' : '全局'
  console.log(`🗑️  开始移除技能 "${skillName}" (${scope})...`)

  if (!(await pathExists(entry.path))) {
    console.warn(`⚠️  技能 "${skillName}" 的目录不存在: ${entry.path}`)
  } else {
    try {
      await fs.promises.rm(entry.path, { recursive: true, force: true })
    } catch (error) {
      console.warn(`⚠️  移除目录失败: ${error}`)
    }
  }

  delete registry[skillName]
  await saveRegistry(registry)

  console.log(`✅ 技能 "${skillName}" 已移除`)
}

export async function listInstalledSkills(): Promise<void> {
  const registry = await loadRegistry()

  if (Object.keys(registry).length === 0) {
    console.log('\n📦 没有已安装的技能\n')
    console.log('使用以下命令安装技能：')
    console.log('  ai-skills add <repo>              # 从 Git 安装（全局）')
    console.log('  ai-skills add <repo> --local      # 从 Git 安装（本地）')
    console.log('  ai-skills add /path/to/skill       # 从本地路径安装')
    return
  }

  console.log('\n已安装的技能:\n')

  for (const [name, entry] of Object.entries(registry)) {
    const scope = entry.isLocal ? '本地' : '全局'
    const installedDate = new Date(entry.installedAt)
    const timeStr = `${installedDate.getFullYear()}/${installedDate.getMonth() + 1}/${installedDate.getDate()} ${installedDate.getHours()}:${String(installedDate.getMinutes()).padStart(2, '0')}:${String(installedDate.getSeconds()).padStart(2, '0')}`

    console.log(`  ✅ ${name} ${entry.version ? `(v${entry.version})` : ''} [${scope}]`)

    if (entry.description) {
      console.log(`     描述: ${entry.description}`)
    }

    const shortPath = entry.path.replace(os.homedir(), '~')
    console.log(`     路径: ${shortPath}`)
    console.log(`     安装时间: ${timeStr}`)

    if (entry.tags && entry.tags.length > 0) {
      console.log(`     标签: ${entry.tags.join(', ')}`)
    }

    console.log()
  }
}

export async function updateAllSkills(): Promise<void> {
  const registry = await loadRegistry()

  if (Object.keys(registry).length === 0) {
    console.log('❌ 没有已安装的技能')
    return
  }

  console.log('🔄 更新所有技能...\n')

  for (const [name, entry] of Object.entries(registry)) {
    if (entry.isLocal) {
      console.log(`⏭️  ${name} 是本地技能，跳过更新`)
      continue
    }

    try {
      console.log(`📦 更新 ${name}...`)
      await execFileAsync('git', ['pull'], { cwd: entry.path })
      console.log(`✅ ${name} 更新成功`)
    } catch {
      console.log(`⚠️  ${name} 更新失败`)
    }
  }
}