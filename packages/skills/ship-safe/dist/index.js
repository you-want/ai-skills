"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__internals = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const COMMAND_TIMEOUT_MS = 5 * 60 * 1000;
const WALK_SKIP_DIRS = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.next',
    '.turbo',
]);
function pathExists(targetPath) {
    return node_fs_1.default.existsSync(targetPath);
}
function detectPackageManager(cwd) {
    if (pathExists(node_path_1.default.join(cwd, 'pnpm-lock.yaml'))) {
        return 'pnpm';
    }
    if (pathExists(node_path_1.default.join(cwd, 'yarn.lock'))) {
        return 'yarn';
    }
    if (pathExists(node_path_1.default.join(cwd, 'bun.lock')) || pathExists(node_path_1.default.join(cwd, 'bun.lockb'))) {
        return 'bun';
    }
    return 'npm';
}
function readPackageJson(cwd) {
    const packageJsonPath = node_path_1.default.join(cwd, 'package.json');
    if (!pathExists(packageJsonPath)) {
        return null;
    }
    try {
        return JSON.parse(node_fs_1.default.readFileSync(packageJsonPath, 'utf8'));
    }
    catch {
        return null;
    }
}
function makeRunScriptCommand(packageManager, scriptName) {
    switch (packageManager) {
        case 'pnpm':
            return ['pnpm', 'run', scriptName];
        case 'yarn':
            return ['yarn', scriptName];
        case 'bun':
            return ['bun', 'run', scriptName];
        case 'npm':
        default:
            return ['npm', 'run', scriptName];
    }
}
function buildValidationCommands(scripts, packageManager) {
    const commands = [];
    const seen = new Set();
    const preferredTestScripts = ['test', 'test:unit', 'test:integration', 'test:e2e'];
    const preferredQualityScripts = ['lint', 'typecheck', 'build', 'check', 'verify'];
    const addScript = (scriptName, kind) => {
        if (!scripts[scriptName] || seen.has(scriptName)) {
            return;
        }
        seen.add(scriptName);
        commands.push({
            name: scriptName,
            kind,
            command: makeRunScriptCommand(packageManager, scriptName),
        });
    };
    preferredTestScripts.forEach(scriptName => addScript(scriptName, 'test'));
    preferredQualityScripts.forEach(scriptName => addScript(scriptName, 'quality'));
    return commands;
}
async function runCommand(command, cwd) {
    const [file, ...args] = command;
    try {
        const { stdout, stderr } = await execFileAsync(file, args, {
            cwd,
            timeout: COMMAND_TIMEOUT_MS,
            maxBuffer: 1024 * 1024,
            env: process.env,
        });
        return {
            ok: true,
            stdout,
            stderr,
        };
    }
    catch (error) {
        const err = error;
        return {
            ok: false,
            stdout: err.stdout ?? '',
            stderr: err.stderr ?? err.message ?? `Command failed: ${command.join(' ')}`,
        };
    }
}
async function runGitCommand(cwd, args) {
    return runCommand(['git', ...args], cwd);
}
async function getStagedFiles(cwd) {
    const result = await runGitCommand(cwd, ['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
    if (!result.ok) {
        return [];
    }
    return result.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
}
function walkFiles(rootDir) {
    const results = [];
    if (!pathExists(rootDir)) {
        return results;
    }
    const visit = (currentDir) => {
        const entries = node_fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (WALK_SKIP_DIRS.has(entry.name)) {
                    continue;
                }
                visit(node_path_1.default.join(currentDir, entry.name));
                continue;
            }
            results.push(node_path_1.default.join(currentDir, entry.name));
        }
    };
    visit(rootDir);
    return results;
}
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}
function isSourceFile(filePath) {
    return /\.[cm]?[jt]sx?$/.test(filePath) && !isTestFile(filePath);
}
function isTestFile(filePath) {
    return /(^|\/)(test|tests|__tests__)\//.test(filePath) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath);
}
function removeSourceExtension(filePath) {
    return filePath.replace(/\.[cm]?[jt]sx?$/, '');
}
function extractTestStem(filePath) {
    const normalized = normalizePath(filePath);
    return removeSourceExtension(normalized).replace(/\.(test|spec)$/, '');
}
function findRepoTests(cwd) {
    return walkFiles(cwd)
        .map(filePath => normalizePath(node_path_1.default.relative(cwd, filePath)))
        .filter(isTestFile);
}
function hasMatchingTest(sourceFile, tests) {
    const normalizedSource = normalizePath(sourceFile);
    const sourceStem = removeSourceExtension(normalizedSource);
    const sourceBasename = node_path_1.default.basename(sourceStem);
    return tests.some(testFile => {
        const testStem = extractTestStem(testFile);
        return (testStem === sourceStem ||
            node_path_1.default.basename(testStem) === sourceBasename ||
            testStem.endsWith(`/${sourceBasename}`));
    });
}
function findUntestedSources(sourceFiles, tests) {
    return sourceFiles.filter(sourceFile => !hasMatchingTest(sourceFile, tests));
}
function clampScore(score) {
    return Math.max(0, Math.min(100, score));
}
function createFailureResult(issues, score) {
    return {
        passed: false,
        score: clampScore(score),
        issues,
    };
}
async function runShipSafe(ctx) {
    const packageJson = readPackageJson(ctx.cwd);
    if (!packageJson?.scripts) {
        return createFailureResult(['No package.json scripts found. ship-safe needs test/lint/typecheck scripts to validate a commit.'], 10);
    }
    const packageManager = detectPackageManager(ctx.cwd);
    const commands = buildValidationCommands(packageJson.scripts, packageManager);
    const issues = [];
    const repoTests = findRepoTests(ctx.cwd);
    const stagedFiles = await getStagedFiles(ctx.cwd);
    const stagedSourceFiles = stagedFiles.filter(isSourceFile);
    const stagedTestFiles = stagedFiles.filter(isTestFile);
    if (!commands.some(command => command.kind === 'test')) {
        issues.push('No runnable test script found. Add scripts like "test", "test:unit", or "test:integration".');
    }
    if (repoTests.length === 0) {
        issues.push('No test files were found in the repository.');
    }
    if (stagedSourceFiles.length > 0 && stagedTestFiles.length === 0) {
        issues.push('Source files are staged but no test files are staged with them.');
    }
    if (stagedSourceFiles.length > 0 && repoTests.length > 0) {
        const untestedSources = findUntestedSources(stagedSourceFiles, repoTests);
        if (untestedSources.length > 0) {
            issues.push(`No related test file found for: ${untestedSources.join(', ')}`);
        }
    }
    const commandFailures = [];
    for (const command of commands) {
        const result = await runCommand(command.command, ctx.cwd);
        if (!result.ok) {
            const output = [result.stderr, result.stdout]
                .filter(Boolean)
                .join('\n')
                .trim()
                .slice(0, 400);
            commandFailures.push(`${command.name} failed.${output ? ` Output: ${output.replace(/\s+/g, ' ')}` : ''}`);
        }
    }
    issues.push(...commandFailures);
    const score = 100 -
        (commands.some(command => command.kind === 'test') ? 0 : 30) -
        (repoTests.length > 0 ? 0 : 20) -
        (stagedSourceFiles.length > 0 && stagedTestFiles.length === 0 ? 15 : 0) -
        Math.min(findUntestedSources(stagedSourceFiles, repoTests).length * 10, 30) -
        Math.min(commandFailures.length * 25, 50);
    return {
        passed: issues.length === 0,
        score: clampScore(score),
        issues,
    };
}
const shipSafe = {
    name: 'ship-safe',
    description: 'Run commit-time safety checks: tests, lint, typecheck, build, and test coverage heuristics.',
    run: runShipSafe,
};
exports.__internals = {
    buildValidationCommands,
    detectPackageManager,
    findUntestedSources,
    hasMatchingTest,
    isSourceFile,
    isTestFile,
    readPackageJson,
};
exports.default = shipSafe;
