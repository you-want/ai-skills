"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAllSkills = loadAllSkills;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
function getSkillDirectories() {
    const directories = [];
    const projectLocalDir = path_1.default.join(process.cwd(), ".ai-skills", "skills");
    directories.push({ path: projectLocalDir, priority: 10 });
    const homeDir = os_1.default.homedir();
    const globalDir = path_1.default.join(homeDir, ".ai-skills", "skills");
    directories.push({ path: globalDir, priority: 5 });
    const builtInDir = path_1.default.join(process.cwd(), "packages", "skills");
    directories.push({ path: builtInDir, priority: 1 });
    return directories;
}
async function loadExecutableSkill(pkgPath, dir) {
    const pkgJsonPath = path_1.default.join(pkgPath, "package.json");
    const entry = path_1.default.join(pkgPath, "dist/index.js");
    if (!fs_1.default.existsSync(pkgJsonPath) || !fs_1.default.existsSync(entry)) {
        return null;
    }
    try {
        const mod = await import(entry);
        let skill = mod;
        while (skill && skill.default) {
            skill = skill.default;
        }
        if (!skill?.name) {
            skill = Object.values(mod).find((v) => v && typeof v === "object" && "name" in v);
        }
        if (!skill?.name) {
            console.warn("⚠️ invalid skill export:", mod);
            return null;
        }
        return skill;
    }
    catch (err) {
        console.error("❌ import failed:", err);
        return null;
    }
}
async function loadDocumentSkill(pkgPath, dir) {
    const skillMdPath = path_1.default.join(pkgPath, "SKILL.md");
    if (!fs_1.default.existsSync(skillMdPath)) {
        return null;
    }
    try {
        const content = fs_1.default.readFileSync(skillMdPath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let name = dir;
        let description = '';
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const nameMatch = frontmatter.match(/name:\s*(.+)/);
            const descMatch = frontmatter.match(/description:\s*(.+)/);
            if (nameMatch)
                name = nameMatch[1].trim();
            if (descMatch)
                description = descMatch[1].trim();
        }
        const skill = {
            name,
            description,
            run: async (ctx) => {
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
                };
            }
        };
        return skill;
    }
    catch (err) {
        console.error("❌ load SKILL.md failed:", err);
        return null;
    }
}
async function loadSkillsFromDir(skillsDir, loadedSkills) {
    if (!fs_1.default.existsSync(skillsDir)) {
        return;
    }
    let dirs;
    try {
        dirs = fs_1.default.readdirSync(skillsDir).sort();
    }
    catch {
        return;
    }
    for (const dir of dirs) {
        const pkgPath = path_1.default.join(skillsDir, dir);
        if (!fs_1.default.statSync(pkgPath).isDirectory()) {
            continue;
        }
        const executableSkill = await loadExecutableSkill(pkgPath, dir);
        if (executableSkill) {
            if (!loadedSkills[executableSkill.name]) {
                loadedSkills[executableSkill.name] = executableSkill;
            }
            continue;
        }
        const documentSkill = await loadDocumentSkill(pkgPath, dir);
        if (documentSkill) {
            if (!loadedSkills[documentSkill.name]) {
                loadedSkills[documentSkill.name] = documentSkill;
            }
            continue;
        }
    }
}
async function loadAllSkills() {
    const skills = {};
    const directories = getSkillDirectories();
    directories.sort((a, b) => b.priority - a.priority);
    for (const dir of directories) {
        await loadSkillsFromDir(dir.path, skills);
    }
    if (Object.keys(skills).length === 0) {
        console.warn("⚠️ no skills found");
    }
    return skills;
}
