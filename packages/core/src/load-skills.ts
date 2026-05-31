import fs from "fs";
import path from "path";
import os from "os";
import type { Skill, SkillContext, SkillResult } from "./types";

interface SkillDirectory {
  path: string
  priority: number
}

function getSkillDirectories(): SkillDirectory[] {
  const directories: SkillDirectory[] = []

  const projectLocalDir = path.join(process.cwd(), ".ai-skills", "skills")
  directories.push({ path: projectLocalDir, priority: 10 })

  const homeDir = os.homedir()
  const globalDir = path.join(homeDir, ".ai-skills", "skills")
  directories.push({ path: globalDir, priority: 5 })

  const builtInDir = path.join(process.cwd(), "packages", "skills")
  directories.push({ path: builtInDir, priority: 1 })

  return directories
}

async function loadExecutableSkill(pkgPath: string, dir: string): Promise<Skill | null> {
  const pkgJsonPath = path.join(pkgPath, "package.json")
  const entry = path.join(pkgPath, "dist/index.js")

  if (!fs.existsSync(pkgJsonPath) || !fs.existsSync(entry)) {
    return null
  }

  try {
    const mod = await import(entry)

    let skill: any = mod

    while (skill && skill.default) {
      skill = skill.default
    }

    if (!skill?.name) {
      skill = Object.values(mod).find(
        (v: any) => v && typeof v === "object" && "name" in v,
      )
    }

    if (!skill?.name) {
      console.warn("⚠️ invalid skill export:", mod)
      return null
    }

    return skill
  } catch (err) {
    console.error("❌ import failed:", err)
    return null
  }
}

async function loadDocumentSkill(pkgPath: string, dir: string): Promise<Skill | null> {
  const skillMdPath = path.join(pkgPath, "SKILL.md")

  if (!fs.existsSync(skillMdPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8')
    
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    let name = dir
    let description = ''

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      const nameMatch = frontmatter.match(/name:\s*(.+)/)
      const descMatch = frontmatter.match(/description:\s*(.+)/)

      if (nameMatch) name = nameMatch[1].trim()
      if (descMatch) description = descMatch[1].trim()
    }

    const skill: Skill = {
      name,
      description,
      run: async (ctx: SkillContext): Promise<SkillResult> => {
        return {
          passed: true,
          score: 100,
          summary: `文档技能 ${name} 已加载`,
          issues: [],
          suggestions: [],
          metadata: {
            type: 'document',
            content: content,
            loadedAt: new Date().toISOString()
          }
        }
      }
    }

    return skill
  } catch (err) {
    console.error("❌ load SKILL.md failed:", err)
    return null
  }
}

async function loadSkillsFromDir(skillsDir: string, loadedSkills: Record<string, Skill>): Promise<void> {
  if (!fs.existsSync(skillsDir)) {
    return
  }

  let dirs: string[]
  try {
    dirs = fs.readdirSync(skillsDir).sort()
  } catch {
    return
  }

  for (const dir of dirs) {
    const pkgPath = path.join(skillsDir, dir)

    if (!fs.statSync(pkgPath).isDirectory()) {
      continue
    }

    const executableSkill = await loadExecutableSkill(pkgPath, dir)
    if (executableSkill) {
      if (!loadedSkills[executableSkill.name]) {
        loadedSkills[executableSkill.name] = executableSkill
      }
      continue
    }

    const documentSkill = await loadDocumentSkill(pkgPath, dir)
    if (documentSkill) {
      if (!loadedSkills[documentSkill.name]) {
        loadedSkills[documentSkill.name] = documentSkill
      }
      continue
    }
  }
}

export async function loadAllSkills() {
  const skills: Record<string, Skill> = {}

  const directories = getSkillDirectories()
  directories.sort((a, b) => b.priority - a.priority)

  for (const dir of directories) {
    await loadSkillsFromDir(dir.path, skills)
  }

  if (Object.keys(skills).length === 0) {
    console.warn("⚠️ no skills found")
  }

  return skills
}