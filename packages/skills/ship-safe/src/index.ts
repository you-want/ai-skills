import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Skill, SkillContext, SkillResult } from '@ai-skills/core'

const execFileAsync = promisify(execFile)
const COMMAND_TIMEOUT_MS = 5 * 60 * 1000
const WALK_SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
])

interface PackageJson {
  scripts?: Record<string, string>
}

interface ValidationCommand {
  name: string
  kind: 'test' | 'quality'
  command: string[]
}

interface CommandExecutionResult {
  ok: boolean
  stdout: string
  stderr: string
}

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

function pathExists(targetPath: string) {
  return fs.existsSync(targetPath)
}

function detectPackageManager(cwd: string): PackageManager {
  if (pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }

  if (pathExists(path.join(cwd, 'yarn.lock'))) {
    return 'yarn'
  }

  if (pathExists(path.join(cwd, 'bun.lock')) || pathExists(path.join(cwd, 'bun.lockb'))) {
    return 'bun'
  }

  return 'npm'
}

function readPackageJson(cwd: string): PackageJson | null {
  const packageJsonPath = path.join(cwd, 'package.json')

  if (!pathExists(packageJsonPath)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson
  } catch {
    return null
  }
}

function makeRunScriptCommand(packageManager: PackageManager, scriptName: string) {
  switch (packageManager) {
    case 'pnpm':
      return ['pnpm', 'run', scriptName]
    case 'yarn':
      return ['yarn', scriptName]
    case 'bun':
      return ['bun', 'run', scriptName]
    case 'npm':
    default:
      return ['npm', 'run', scriptName]
  }
}

function buildValidationCommands(
  scripts: Record<string, string>,
  packageManager: PackageManager,
): ValidationCommand[] {
  const commands: ValidationCommand[] = []
  const seen = new Set<string>()
  const preferredTestScripts = ['test', 'test:unit', 'test:integration', 'test:e2e']
  const preferredQualityScripts = ['lint', 'typecheck', 'build', 'check', 'verify']

  const addScript = (scriptName: string, kind: ValidationCommand['kind']) => {
    if (!scripts[scriptName] || seen.has(scriptName)) {
      return
    }

    seen.add(scriptName)
    commands.push({
      name: scriptName,
      kind,
      command: makeRunScriptCommand(packageManager, scriptName),
    })
  }

  preferredTestScripts.forEach(scriptName => addScript(scriptName, 'test'))
  preferredQualityScripts.forEach(scriptName => addScript(scriptName, 'quality'))

  return commands
}

async function runCommand(command: string[], cwd: string): Promise<CommandExecutionResult> {
  const [file, ...args] = command

  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      cwd,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      env: process.env,
    })

    return {
      ok: true,
      stdout,
      stderr,
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string
      stderr?: string
      code?: number | string
    }

    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? `Command failed: ${command.join(' ')}`,
    }
  }
}

async function runGitCommand(cwd: string, args: string[]) {
  return runCommand(['git', ...args], cwd)
}

async function getStagedFiles(cwd: string) {
  const result = await runGitCommand(cwd, ['diff', '--cached', '--name-only', '--diff-filter=ACMR'])

  if (!result.ok) {
    return []
  }

  return result.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function walkFiles(rootDir: string): string[] {
  const results: string[] = []

  if (!pathExists(rootDir)) {
    return results
  }

  const visit = (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (WALK_SKIP_DIRS.has(entry.name)) {
          continue
        }

        visit(path.join(currentDir, entry.name))
        continue
      }

      results.push(path.join(currentDir, entry.name))
    }
  }

  visit(rootDir)

  return results
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, '/')
}

function isSourceFile(filePath: string) {
  return /\.[cm]?[jt]sx?$/.test(filePath) && !isTestFile(filePath)
}

function isTestFile(filePath: string) {
  return /(^|\/)(test|tests|__tests__)\//.test(filePath) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath)
}

function removeSourceExtension(filePath: string) {
  return filePath.replace(/\.[cm]?[jt]sx?$/, '')
}

function extractTestStem(filePath: string) {
  const normalized = normalizePath(filePath)
  return removeSourceExtension(normalized).replace(/\.(test|spec)$/, '')
}

function findRepoTests(cwd: string) {
  return walkFiles(cwd)
    .map(filePath => normalizePath(path.relative(cwd, filePath)))
    .filter(isTestFile)
}

function hasMatchingTest(sourceFile: string, tests: string[]) {
  const normalizedSource = normalizePath(sourceFile)
  const sourceStem = removeSourceExtension(normalizedSource)
  const sourceBasename = path.basename(sourceStem)

  return tests.some(testFile => {
    const testStem = extractTestStem(testFile)

    return (
      testStem === sourceStem ||
      path.basename(testStem) === sourceBasename ||
      testStem.endsWith(`/${sourceBasename}`)
    )
  })
}

function findUntestedSources(sourceFiles: string[], tests: string[]) {
  return sourceFiles.filter(sourceFile => !hasMatchingTest(sourceFile, tests))
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
}

function createFailureResult(issues: string[], score: number): SkillResult {
  return {
    passed: false,
    score: clampScore(score),
    issues,
  }
}

async function runShipSafe(ctx: SkillContext): Promise<SkillResult> {
  const packageJson = readPackageJson(ctx.cwd)

  if (!packageJson?.scripts) {
    return createFailureResult(
      ['No package.json scripts found. ship-safe needs test/lint/typecheck scripts to validate a commit.'],
      10,
    )
  }

  const packageManager = detectPackageManager(ctx.cwd)
  const commands = buildValidationCommands(packageJson.scripts, packageManager)
  const issues: string[] = []
  const repoTests = findRepoTests(ctx.cwd)
  const stagedFiles = await getStagedFiles(ctx.cwd)
  const stagedSourceFiles = stagedFiles.filter(isSourceFile)
  const stagedTestFiles = stagedFiles.filter(isTestFile)

  if (!commands.some(command => command.kind === 'test')) {
    issues.push('No runnable test script found. Add scripts like "test", "test:unit", or "test:integration".')
  }

  if (repoTests.length === 0) {
    issues.push('No test files were found in the repository.')
  }

  if (stagedSourceFiles.length > 0 && stagedTestFiles.length === 0) {
    issues.push('Source files are staged but no test files are staged with them.')
  }

  if (stagedSourceFiles.length > 0 && repoTests.length > 0) {
    const untestedSources = findUntestedSources(stagedSourceFiles, repoTests)

    if (untestedSources.length > 0) {
      issues.push(`No related test file found for: ${untestedSources.join(', ')}`)
    }
  }

  const commandFailures: string[] = []

  for (const command of commands) {
    const result = await runCommand(command.command, ctx.cwd)

    if (!result.ok) {
      const output = [result.stderr, result.stdout]
        .filter(Boolean)
        .join('\n')
        .trim()
        .slice(0, 400)

      commandFailures.push(
        `${command.name} failed.${output ? ` Output: ${output.replace(/\s+/g, ' ')}` : ''}`,
      )
    }
  }

  issues.push(...commandFailures)

  const score =
    100 -
    (commands.some(command => command.kind === 'test') ? 0 : 30) -
    (repoTests.length > 0 ? 0 : 20) -
    (stagedSourceFiles.length > 0 && stagedTestFiles.length === 0 ? 15 : 0) -
    Math.min(findUntestedSources(stagedSourceFiles, repoTests).length * 10, 30) -
    Math.min(commandFailures.length * 25, 50)

  return {
    passed: issues.length === 0,
    score: clampScore(score),
    issues,
  }
}

const shipSafe: Skill = {
  name: 'ship-safe',
  description: 'Run commit-time safety checks: tests, lint, typecheck, build, and test coverage heuristics.',
  run: runShipSafe,
}

export const __internals = {
  buildValidationCommands,
  detectPackageManager,
  findUntestedSources,
  hasMatchingTest,
  isSourceFile,
  isTestFile,
  readPackageJson,
}

export default shipSafe
