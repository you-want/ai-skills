import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ShipSafeSkillConfig, Skill, SkillCheck, SkillContext, SkillResult, SkillSuggestion } from '@ai-skills/core'

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

interface ExecutedValidation {
  command: ValidationCommand
  ok: boolean
  output?: string
}

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

function getShipSafeConfig(ctx: SkillContext): Required<ShipSafeSkillConfig> {
  const configured = ctx.config?.skills?.['ship-safe'] ?? {}

  return {
    testScripts: configured.testScripts ?? ['test', 'test:unit', 'test:integration', 'test:e2e'],
    qualityScripts: configured.qualityScripts ?? ['lint', 'typecheck', 'build', 'check', 'verify'],
    requireRepoTests: configured.requireRepoTests ?? true,
    requireStagedTestFiles: configured.requireStagedTestFiles ?? true,
    requireMatchingTestsForChangedFiles: configured.requireMatchingTestsForChangedFiles ?? true,
  }
}

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
  config: Required<ShipSafeSkillConfig>,
): ValidationCommand[] {
  const commands: ValidationCommand[] = []
  const seen = new Set<string>()

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

  config.testScripts.forEach(scriptName => addScript(scriptName, 'test'))
  config.qualityScripts.forEach(scriptName => addScript(scriptName, 'quality'))

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

async function runGitCommand(projectPath: string, args: string[]) {
  return runCommand(['git', ...args], projectPath)
}

async function getStagedFiles(projectPath: string) {
  const result = await runGitCommand(projectPath, ['diff', '--cached', '--name-only', '--diff-filter=ACMR'])

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

function findRepoTests(projectPath: string) {
  return walkFiles(projectPath)
    .map(filePath => normalizePath(path.relative(projectPath, filePath)))
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
    summary: 'ship-safe could not complete the required commit-time validation.',
    issues,
    suggestions: [
      {
        title: 'Add runnable project scripts',
        detail: 'Define test, lint, and typecheck scripts in package.json so ship-safe can execute them.',
      },
    ],
    checks: [
      {
        id: 'project-setup',
        label: 'Project setup',
        status: 'fail',
        details: issues[0],
      },
    ],
  }
}

function createCheck(id: string, label: string, status: SkillCheck['status'], details?: string, durationMs?: number, metadata?: Record<string, unknown>): SkillCheck {
  return {
    id,
    label,
    status,
    details,
    durationMs,
    metadata,
  }
}

function createSuggestions(options: {
  missingTestScript: boolean
  missingRepoTests: boolean
  missingStagedTests: boolean
  untestedSources: string[]
  failedCommands: ExecutedValidation[]
}): SkillSuggestion[] {
  const suggestions: SkillSuggestion[] = []

  if (options.missingTestScript) {
    suggestions.push({
      title: 'Add a test script',
      detail: 'Expose scripts like "test" or "test:unit" in package.json.',
    })
  }

  if (options.missingRepoTests) {
    suggestions.push({
      title: 'Create baseline automated tests',
      detail: 'Add at least one repository test so ship-safe can validate coverage signals.',
    })
  }

  if (options.missingStagedTests || options.untestedSources.length > 0) {
    suggestions.push({
      title: 'Ship source changes with matching tests',
      detail: 'Stage related test files for the changed source modules before committing.',
    })
  }

  if (options.failedCommands.length > 0) {
    suggestions.push({
      title: 'Fix failing validation commands',
      detail: options.failedCommands.map(result => result.command.name).join(', '),
    })
  }

  return suggestions
}

async function runShipSafe(ctx: SkillContext): Promise<SkillResult> {
  const startedAt = Date.now()
  const config = getShipSafeConfig(ctx)
  const packageJson = readPackageJson(ctx.projectPath)

  if (!packageJson?.scripts) {
    return createFailureResult(
      ['No package.json scripts found. ship-safe needs test/lint/typecheck scripts to validate a commit.'],
      10,
    )
  }

  const packageManager = detectPackageManager(ctx.projectPath)
  const commands = buildValidationCommands(packageJson.scripts, packageManager, config)
  const issues: string[] = []
  const repoTests = findRepoTests(ctx.projectPath)
  const changedFiles = ctx.changedFiles && ctx.changedFiles.length > 0
    ? ctx.changedFiles
    : await getStagedFiles(ctx.projectPath)
  const stagedFiles = changedFiles.map(normalizePath)
  const stagedSourceFiles = stagedFiles.filter(isSourceFile)
  const stagedTestFiles = stagedFiles.filter(isTestFile)
  const checks: SkillCheck[] = []
  const missingTestScript = !commands.some(command => command.kind === 'test')
  const missingRepoTests = config.requireRepoTests && repoTests.length === 0
  const missingStagedTests = config.requireStagedTestFiles && stagedSourceFiles.length > 0 && stagedTestFiles.length === 0

  if (missingTestScript) {
    issues.push('No runnable test script found. Add scripts like "test", "test:unit", or "test:integration".')
  }

  if (missingRepoTests) {
    issues.push('No test files were found in the repository.')
  }

  if (missingStagedTests) {
    issues.push('Source files are staged but no test files are staged with them.')
  }

  const untestedSources = config.requireMatchingTestsForChangedFiles && stagedSourceFiles.length > 0 && repoTests.length > 0
    ? findUntestedSources(stagedSourceFiles, repoTests)
    : []

  if (stagedSourceFiles.length > 0 && repoTests.length > 0) {
    if (untestedSources.length > 0) {
      issues.push(`No related test file found for: ${untestedSources.join(', ')}`)
    }
  }

  checks.push(
    createCheck(
      'test-script',
      'Test script available',
      missingTestScript ? 'fail' : 'pass',
      missingTestScript ? 'No runnable test script found in package.json.' : `Detected ${commands.filter(command => command.kind === 'test').length} test script(s).`,
      undefined,
      { commandCount: commands.length },
    ),
  )
  checks.push(
    createCheck(
      'repo-tests',
      'Repository tests',
      missingRepoTests ? 'fail' : 'pass',
      missingRepoTests ? 'No test files were found in the repository.' : `Found ${repoTests.length} test file(s).`,
      undefined,
      { repoTests: repoTests.length },
    ),
  )
  if (stagedSourceFiles.length > 0) {
    checks.push(
      createCheck(
        'changed-files-tests',
        'Changed files covered',
        missingStagedTests || untestedSources.length > 0 ? 'warn' : 'pass',
        missingStagedTests
          ? 'Source changes are staged without staged tests.'
          : untestedSources.length > 0
            ? `Missing related tests for: ${untestedSources.join(', ')}`
            : 'Changed source files have matching tests.',
        undefined,
        {
          changedSourceFiles: stagedSourceFiles.length,
          stagedTestFiles: stagedTestFiles.length,
          requireMatchingTestsForChangedFiles: config.requireMatchingTestsForChangedFiles,
        },
      ),
    )
  }

  const executedValidations: ExecutedValidation[] = []

  for (const command of commands) {
    const commandStartedAt = Date.now()
    const result = await runCommand(command.command, ctx.projectPath)
    const durationMs = Date.now() - commandStartedAt

    if (!result.ok) {
      const output = [result.stderr, result.stdout]
        .filter(Boolean)
        .join('\n')
        .trim()
        .slice(0, 400)

      executedValidations.push({
        command,
        ok: false,
        output: output.replace(/\s+/g, ' '),
      })
      checks.push(
        createCheck(
          `command:${command.name}`,
          `Run ${command.name}`,
          'fail',
          output ? output.replace(/\s+/g, ' ') : `${command.name} failed.`,
          durationMs,
        ),
      )
      continue
    }

    executedValidations.push({
      command,
      ok: true,
    })
    checks.push(
      createCheck(
        `command:${command.name}`,
        `Run ${command.name}`,
        'pass',
        `${command.name} completed successfully.`,
        durationMs,
      ),
    )
  }

  const failedCommands = executedValidations.filter(result => !result.ok)
  const commandFailures = failedCommands.map(
    result => `${result.command.name} failed.${result.output ? ` Output: ${result.output}` : ''}`,
  )
  issues.push(...commandFailures)

  const score =
    100 -
    (missingTestScript ? 30 : 0) -
    (missingRepoTests ? 20 : 0) -
    (missingStagedTests ? 15 : 0) -
    Math.min(untestedSources.length * 10, 30) -
    Math.min(commandFailures.length * 25, 50)

  const summary = issues.length === 0
    ? 'All detected commit-time checks passed. This change looks safe to ship.'
    : `ship-safe found ${issues.length} issue(s) across test readiness and validation commands.`
  const durationMs = Date.now() - startedAt

  return {
    passed: issues.length === 0,
    score: clampScore(score),
    summary,
    issues,
    suggestions: createSuggestions({
      missingTestScript,
      missingRepoTests,
      missingStagedTests,
      untestedSources,
      failedCommands,
    }),
    checks,
    metadata: {
      packageManager,
        changedFiles: stagedFiles.length,
        repoTests: repoTests.length,
        validationCommands: commands.map(command => command.name),
        config,
      },
    durationMs,
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
  getShipSafeConfig,
  hasMatchingTest,
  isSourceFile,
  isTestFile,
  readPackageJson,
}

export default shipSafe
