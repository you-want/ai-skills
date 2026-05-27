"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAllSkills = loadAllSkills;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function loadAllSkills() {
    const skills = {};
    const skillsDir = path_1.default.join(process.cwd(), "packages/skills");
    if (!fs_1.default.existsSync(skillsDir)) {
        console.warn("❌ skills directory not found");
        return skills;
    }
    const dirs = fs_1.default.readdirSync(skillsDir).sort();
    for (const dir of dirs) {
        const pkgPath = path_1.default.join(skillsDir, dir);
        const pkgJsonPath = path_1.default.join(pkgPath, "package.json");
        const entry = path_1.default.join(pkgPath, "dist/index.js");
        if (!fs_1.default.existsSync(pkgJsonPath)) {
            continue;
        }
        if (!fs_1.default.existsSync(entry)) {
            continue;
        }
        try {
            const mod = await import(entry);
            // 👇 自动解包（防止 default 套娃）
            let skill = mod;
            while (skill && skill.default) {
                skill = skill.default;
            }
            // 👇 兜底：如果是命名导出
            if (!skill?.name) {
                skill = Object.values(mod).find((v) => v && typeof v === "object" && "name" in v);
            }
            if (!skill?.name) {
                console.warn("⚠️ invalid skill export:", mod);
                continue;
            }
            skills[skill.name] = skill;
        }
        catch (err) {
            console.error("❌ import failed:", err);
        }
    }
    return skills;
}
