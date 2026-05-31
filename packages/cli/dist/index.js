#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const core_1 = require("@ai-skills/core");
const skill_js_1 = require("./commands/skill.js");
const program = new commander_1.Command();
program
    .name('ai-skills')
    .description('AI Skills Engine - 可扩展的 AI 技能引擎')
    .version('0.0.1');
program
    .command('add')
    .description('安装技能')
    .argument('<repo>', '技能仓库地址 (GitHub 短名或完整 URL)')
    .option('-l, --local', '安装到本地项目目录 (.ai-skills/skills/) 而非全局')
    .option('-b, --branch <branch>', '指定分支或标签', 'main')
    .action(async (repo, options) => {
    try {
        await (0, skill_js_1.addSkill)(repo, options);
    }
    catch (error) {
        process.exit(1);
    }
});
program
    .command('remove')
    .alias('rm')
    .description('移除已安装的技能')
    .argument('<name>', '技能名称')
    .action(async (name) => {
    try {
        await (0, skill_js_1.removeSkill)(name);
    }
    catch (error) {
        process.exit(1);
    }
});
program
    .command('list')
    .alias('ls')
    .description('列出已安装的技能')
    .action(async () => {
    await (0, skill_js_1.listInstalledSkills)();
});
program
    .command('update')
    .description('更新所有技能')
    .action(async () => {
    try {
        await (0, skill_js_1.updateAllSkills)();
    }
    catch (error) {
        process.exit(1);
    }
});
program
    .command('run')
    .description('运行技能')
    .argument('<skill-name>', '技能名称 (或 "all" 运行所有技能)')
    .option('--project <path>', '目标项目路径')
    .option('--changed <files>', '逗号分隔的变更文件列表')
    .option('--config <path>', '从自定义路径加载 ai-skills 配置')
    .option('--json', '输出机器可读的 JSON 格式')
    .action(async (skillName, options) => {
    const projectPath = options.project ?? process.cwd();
    const changedFiles = options.changed?.split(',').map((f) => f.trim());
    const configPath = options.config;
    const config = await (0, core_1.loadConfig)({
        projectPath,
        configPath,
    });
    const context = {
        projectPath,
        changedFiles,
        config,
    };
    if (skillName === 'all') {
        const skills = await (0, core_1.loadAllSkills)();
        for (const skill of Object.values(skills)) {
            await (0, core_1.runSkill)(skill, context, {
                output: options.json ? 'silent' : 'text',
            });
        }
        return;
    }
    const skills = await (0, core_1.loadAllSkills)();
    const skill = skills[skillName];
    if (!skill) {
        console.error(`❌ 技能未找到: ${skillName}`);
        process.exit(1);
    }
    await (0, core_1.runSkill)(skill, context, {
        output: options.json ? 'silent' : 'text',
    });
});
program
    .command('help')
    .description('显示帮助信息')
    .action(() => {
    program.help();
});
program.parse();
