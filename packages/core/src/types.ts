export interface SkillContext {
  projectPath: string
  changedFiles?: string[]
  config?: AiSkillsConfig
}

export interface ShipSafeSkillConfig {
  testScripts?: string[]
  qualityScripts?: string[]
  requireRepoTests?: boolean
  requireStagedTestFiles?: boolean
  requireMatchingTestsForChangedFiles?: boolean
}

export interface AiSkillsConfig {
  skills?: {
    'ship-safe'?: ShipSafeSkillConfig
    [skillName: string]: Record<string, unknown> | undefined
  }
}

export type SkillCheckStatus = 'pass' | 'warn' | 'fail'

export interface SkillCheck {
  id: string
  label: string
  status: SkillCheckStatus
  details?: string
  durationMs?: number
  metadata?: Record<string, unknown>
}

export interface SkillSuggestion {
  title: string
  detail?: string
}

export interface SkillResult {
  passed: boolean
  score: number
  summary?: string
  issues: string[]
  suggestions?: SkillSuggestion[]
  checks?: SkillCheck[]
  metadata?: Record<string, unknown>
  durationMs?: number
}

export interface Skill {
  name: string
  description?: string
  run(ctx: SkillContext): Promise<SkillResult>
}
