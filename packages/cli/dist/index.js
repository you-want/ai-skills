#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const core_1 = require("@ai-skills/core");
function printHelp() {
    console.log(`
ai-skills

Usage:
  ai-skills run <skill-name>
  ai-skills run all
  ai-skills list
  ai-skills help

Options:
  --project <path>     Target project path to inspect
  --changed <files>    Comma-separated changed files passed into skills
  --config <path>      Load ai-skills config from a custom path
  --json               Output machine-readable JSON
  -h, --help           Show help

Examples:
  ai-skills list
  ai-skills run ship-safe
  ai-skills run ship-safe --project ../my-app
  ai-skills run ship-safe --changed src/app.ts,test/app.test.ts
  ai-skills run ship-safe --json
`.trim());
}
function parseChangedFiles(rawValue) {
    if (!rawValue) {
        return undefined;
    }
    const changedFiles = rawValue
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
    return changedFiles.length ? changedFiles : undefined;
}
function parseArgs(argv) {
    let projectPath = process.cwd();
    let changedFiles;
    let configPath;
    let json = false;
    const positional = [];
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--project') {
            projectPath = node_path_1.default.resolve(argv[index + 1] ?? process.cwd());
            index += 1;
            continue;
        }
        if (arg === '--changed') {
            changedFiles = parseChangedFiles(argv[index + 1]);
            index += 1;
            continue;
        }
        if (arg === '--config') {
            configPath = argv[index + 1];
            index += 1;
            continue;
        }
        if (arg === '--json') {
            json = true;
            continue;
        }
        if (arg === '-h' || arg === '--help') {
            return {
                command: 'help',
                projectPath,
                changedFiles,
                configPath,
                json,
            };
        }
        positional.push(arg);
    }
    return {
        command: positional[0] ?? 'help',
        target: positional[1],
        projectPath,
        changedFiles,
        configPath,
        json,
    };
}
function printSkillsList(skills) {
    const entries = Object.values(skills).sort((left, right) => left.name.localeCompare(right.name));
    if (entries.length === 0) {
        console.log('No skills found.');
        return;
    }
    const nameWidth = Math.max(...entries.map(skill => skill.name.length), 4);
    const descriptionWidth = Math.max(...entries.map(skill => (skill.description ?? '').length), 'Description'.length);
    const header = `${'Name'.padEnd(nameWidth)}  ${'Description'.padEnd(descriptionWidth)}`;
    console.log(header);
    console.log(`${'-'.repeat(nameWidth)}  ${'-'.repeat(descriptionWidth)}`);
    for (const skill of entries) {
        console.log(`${skill.name.padEnd(nameWidth)}  ${(skill.description ?? '').padEnd(descriptionWidth)}`);
    }
}
function printJson(value) {
    console.log(JSON.stringify(value, null, 2));
}
async function main() {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.command === 'help') {
        printHelp();
        return;
    }
    const skills = await (0, core_1.loadAllSkills)();
    const config = await (0, core_1.loadConfig)({
        projectPath: parsed.projectPath,
        configPath: parsed.configPath,
    });
    if (parsed.command === 'list') {
        if (parsed.json) {
            printJson({
                skills: Object.values(skills)
                    .sort((left, right) => left.name.localeCompare(right.name))
                    .map(skill => ({
                    name: skill.name,
                    description: skill.description ?? null,
                })),
            });
            return;
        }
        printSkillsList(skills);
        return;
    }
    if (parsed.command === 'run') {
        if (!parsed.target) {
            printHelp();
            process.exitCode = 1;
            return;
        }
        const context = {
            projectPath: parsed.projectPath,
            changedFiles: parsed.changedFiles,
            config,
        };
        if (parsed.target === 'all') {
            const results = [];
            for (const skill of Object.values(skills)) {
                const result = await (0, core_1.runSkill)(skill, context, {
                    output: parsed.json ? 'silent' : 'text',
                });
                results.push({
                    skill: skill.name,
                    result,
                });
            }
            if (parsed.json) {
                printJson({
                    projectPath: parsed.projectPath,
                    changedFiles: parsed.changedFiles ?? [],
                    results,
                });
            }
            return;
        }
        const skill = skills[parsed.target];
        if (!skill) {
            console.error(`❌ Skill not found: ${parsed.target}`);
            process.exit(1);
        }
        const result = await (0, core_1.runSkill)(skill, context, {
            output: parsed.json ? 'silent' : 'text',
        });
        if (parsed.json) {
            printJson({
                projectPath: parsed.projectPath,
                changedFiles: parsed.changedFiles ?? [],
                skill: skill.name,
                result,
            });
        }
        return;
    }
    printHelp();
    process.exitCode = 1;
}
main().catch(error => {
    console.error('❌ ai-skills failed');
    console.error(error);
    process.exit(1);
});
