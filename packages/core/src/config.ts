import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { AiSkillsConfig } from './types.js'

export const defaultConfig: AiSkillsConfig = {
  skills: {
    'ship-safe': {
      testScripts: ['test', 'test:unit', 'test:integration', 'test:e2e'],
      qualityScripts: ['lint', 'typecheck', 'build', 'check', 'verify'],
      requireRepoTests: true,
      requireStagedTestFiles: true,
      requireMatchingTestsForChangedFiles: true,
    },
  },
}

export interface LoadConfigOptions {
  configPath?: string
  projectPath: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeRecords(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(override)) {
    const current = next[key]

    if (isObject(current) && isObject(value)) {
      next[key] = mergeRecords(current, value)
      continue
    }

    next[key] = value
  }

  return next
}

async function readConfigFile(configFilePath: string): Promise<AiSkillsConfig> {
  if (configFilePath.endsWith('.json')) {
    return JSON.parse(fs.readFileSync(configFilePath, 'utf8')) as AiSkillsConfig
  }

  const imported = await import(`${pathToFileURL(configFilePath).href}?t=${Date.now()}`)
  const rawConfig = imported.default ?? imported

  return rawConfig as AiSkillsConfig
}

function findConfigPath(projectPath: string) {
  const candidates = [
    'ai-skills.config.json',
    'ai-skills.config.js',
    'ai-skills.config.mjs',
    'ai-skills.config.cjs',
  ]

  for (const candidate of candidates) {
    const candidatePath = path.join(projectPath, candidate)

    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return undefined
}

export async function loadConfig(options: LoadConfigOptions): Promise<AiSkillsConfig> {
  const resolvedConfigPath = options.configPath
    ? path.resolve(options.projectPath, options.configPath)
    : findConfigPath(options.projectPath)

  if (!resolvedConfigPath) {
    return defaultConfig
  }

  const loaded = await readConfigFile(resolvedConfigPath)
  const merged = mergeRecords(defaultConfig as Record<string, unknown>, loaded as Record<string, unknown>)
  return merged as AiSkillsConfig
}
