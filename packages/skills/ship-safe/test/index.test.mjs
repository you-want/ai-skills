import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import shipSafeModule, { __internals } from '../dist/index.js'

const shipSafe = shipSafeModule.run ? shipSafeModule : shipSafeModule.default

function makeTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ship-safe-'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

test('detectPackageManager prefers pnpm lockfile', () => {
  const cwd = makeTempProject()
  fs.writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0')

  assert.equal(__internals.detectPackageManager(cwd), 'pnpm')
})

test('buildValidationCommands includes test and quality scripts in a stable order', () => {
  const commands = __internals.buildValidationCommands(
    {
      build: 'tsc -b',
      test: 'node --test',
      lint: 'eslint .',
      typecheck: 'tsc --noEmit',
    },
    'npm',
    __internals.getShipSafeConfig({ projectPath: process.cwd() }),
  )

  assert.deepEqual(
    commands.map(command => command.name),
    ['test', 'lint', 'typecheck', 'build'],
  )
})

test('findUntestedSources reports only source files without matching tests', () => {
  const sourceFiles = ['src/math.ts', 'src/logger.ts']
  const tests = ['src/math.test.ts', 'test/helpers.spec.ts']

  assert.deepEqual(__internals.findUntestedSources(sourceFiles, tests), ['src/logger.ts'])
})

test('ship-safe passes when tests and checks succeed', async () => {
  const cwd = makeTempProject()

  writeJson(path.join(cwd, 'package.json'), {
    name: 'fixture-pass',
    scripts: {
      test: 'node --test test/**/*.test.js',
      lint: 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
    },
  })

  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true })
  fs.mkdirSync(path.join(cwd, 'test'), { recursive: true })
  fs.writeFileSync(path.join(cwd, 'src', 'sum.js'), 'export const sum = (a, b) => a + b\n')
  fs.writeFileSync(
    path.join(cwd, 'test', 'sum.test.js'),
    "import test from 'node:test'\nimport assert from 'node:assert/strict'\n\ntest('sum', () => {\n  assert.equal(1 + 1, 2)\n})\n",
  )

  const result = await shipSafe.run({ projectPath: cwd })

  assert.equal(result.passed, true)
  assert.equal(result.issues.length, 0)
  assert.equal(result.score, 100)
  assert.match(result.summary, /safe to ship/i)
  assert.ok(Array.isArray(result.checks))
  assert.ok(result.checks.some(check => check.id === 'command:test' && check.status === 'pass'))
  assert.equal(result.suggestions?.length ?? 0, 0)
  assert.equal(result.metadata?.packageManager, 'npm')
  assert.equal(typeof result.durationMs, 'number')
})

test('ship-safe fails when staged source changes do not have tests', async () => {
  const cwd = makeTempProject()

  writeJson(path.join(cwd, 'package.json'), {
    name: 'fixture-fail',
    scripts: {
      test: 'node -e "process.exit(0)"',
    },
  })

  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true })
  fs.writeFileSync(path.join(cwd, 'src', 'feature.ts'), 'export const feature = true\n')

  execFileSync('git', ['init'], { cwd, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', 'ship-safe@example.com'], { cwd, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.name', 'Ship Safe'], { cwd, stdio: 'ignore' })
  execFileSync('git', ['add', 'src/feature.ts', 'package.json'], { cwd, stdio: 'ignore' })

  const result = await shipSafe.run({ projectPath: cwd })

  assert.equal(result.passed, false)
  assert.match(result.issues.join('\n'), /no test files were found/i)
  assert.match(result.issues.join('\n'), /no test files are staged/i)
  assert.match(result.summary, /found .* issue/i)
  assert.ok(result.checks.some(check => check.id === 'repo-tests' && check.status === 'fail'))
  assert.ok(result.checks.some(check => check.id === 'changed-files-tests' && check.status === 'warn'))
  assert.ok(result.suggestions?.some(suggestion => /baseline automated tests/i.test(suggestion.title)))
  assert.equal(result.metadata?.changedFiles, 2)
})

test('ship-safe respects custom config for script names and test requirements', async () => {
  const cwd = makeTempProject()

  writeJson(path.join(cwd, 'package.json'), {
    name: 'fixture-configured',
    scripts: {
      verify: 'node -e "process.exit(0)"',
    },
  })

  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true })
  fs.writeFileSync(path.join(cwd, 'src', 'feature.ts'), 'export const feature = true\n')

  const result = await shipSafe.run({
    projectPath: cwd,
    changedFiles: ['src/feature.ts'],
    config: {
      skills: {
        'ship-safe': {
          testScripts: ['verify'],
          qualityScripts: [],
          requireRepoTests: false,
          requireStagedTestFiles: false,
          requireMatchingTestsForChangedFiles: false,
        },
      },
    },
  })

  assert.equal(result.passed, true)
  assert.equal(result.issues.length, 0)
  assert.ok(result.checks.some(check => check.id === 'command:verify' && check.status === 'pass'))
  assert.equal(result.metadata?.config?.testScripts?.[0], 'verify')
})
