import path from 'node:path'
import { Skill, SkillCheck, SkillContext, SkillResult } from './types.js'

export interface RunSkillOptions {
  output?: 'text' | 'silent'
}

const ANSI = {
  reset: '\u001B[0m',
  dim: '\u001B[2m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  green: '\u001B[32m',
  cyan: '\u001B[36m',
  bold: '\u001B[1m',
}

function colorize(text: string, color: string) {
  return `${color}${text}${ANSI.reset}`
}

function formatBadge(result: SkillResult) {
  if (!result.passed) {
    return colorize('🔴 FAIL', ANSI.red)
  }

  if (result.score >= 90) {
    return colorize('🟢 PASS', ANSI.green)
  }

  if (result.score >= 70) {
    return colorize('🟡 WARN', ANSI.yellow)
  }

  return colorize('🔴 FAIL', ANSI.red)
}

function formatMetaLine(label: string, value: string) {
  return `${colorize(label.padEnd(8), ANSI.cyan)} ${value}`
}

function formatCheckStatus(check: SkillCheck) {
  switch (check.status) {
    case 'pass':
      return colorize('PASS', ANSI.green)
    case 'warn':
      return colorize('WARN', ANSI.yellow)
    case 'fail':
    default:
      return colorize('FAIL', ANSI.red)
  }
}

function printSkillReport(skill: Skill, result: SkillResult, ctx: SkillContext) {
  const heading = colorize(`${ANSI.bold}${skill.name}${ANSI.reset}`, ANSI.bold)

  console.log(`\n${heading}`)
  console.log(colorize('─'.repeat(Math.max(skill.name.length, 12)), ANSI.dim))
  console.log(formatMetaLine('Status', formatBadge(result)))
  console.log(formatMetaLine('Score', `${result.score}/100`))
  console.log(formatMetaLine('Project', path.resolve(ctx.projectPath)))

  if (ctx.changedFiles?.length) {
    console.log(formatMetaLine('Changed', `${ctx.changedFiles.length} file(s)`))
  }

  if (typeof result.durationMs === 'number') {
    console.log(formatMetaLine('Time', `${result.durationMs}ms`))
  }

  if (result.summary) {
    console.log(`\n${result.summary}`)
  }

  if (result.checks?.length) {
    console.log(`\n${colorize('Checks', ANSI.bold)}`)
    result.checks.forEach(check => {
      const duration = typeof check.durationMs === 'number' ? ` (${check.durationMs}ms)` : ''
      console.log(`- ${check.label.padEnd(20)} ${formatCheckStatus(check)}${duration}`)
      if (check.details) {
        console.log(`  ${check.details}`)
      }
    })
  }

  if (result.issues.length === 0) {
    console.log(`\n${colorize('No issues found.', ANSI.green)}`)
  } else {
    console.log(`\n${colorize('Issues', ANSI.bold)}`)
    result.issues.forEach((issue, index) => {
      console.log(`${String(index + 1).padStart(2, ' ')}. ${issue}`)
    })
  }

  if (result.suggestions?.length) {
    console.log(`\n${colorize('Suggestions', ANSI.bold)}`)
    result.suggestions.forEach((suggestion, index) => {
      const detail = suggestion.detail ? `: ${suggestion.detail}` : ''
      console.log(`${String(index + 1).padStart(2, ' ')}. ${suggestion.title}${detail}`)
    })
  }
}

export async function runSkill(skill: Skill, ctx?: Partial<SkillContext>, options?: RunSkillOptions) {
  const resolvedContext: SkillContext = {
    projectPath: ctx?.projectPath ?? process.cwd(),
    changedFiles: ctx?.changedFiles,
    config: ctx?.config,
  }

  const result = await skill.run(resolvedContext)

  if (options?.output !== 'silent') {
    printSkillReport(skill, result, resolvedContext)
    console.log('')
  }

  if (!result.passed) {
    process.exitCode = 1
  }

  return result
}
