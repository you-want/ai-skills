import fs from "fs";
import path from "path";

export async function loadAllSkills() {
  const skills: Record<string, any> = {};

  const skillsDir = path.join(process.cwd(), "packages/skills");

  console.log("👉 scanning:", skillsDir);

  if (!fs.existsSync(skillsDir)) {
    console.warn("❌ skills directory not found");
    return skills;
  }

  const dirs = fs.readdirSync(skillsDir);

  for (const dir of dirs) {
    const pkgPath = path.join(skillsDir, dir);
    const pkgJsonPath = path.join(pkgPath, "package.json");
    const entry = path.join(pkgPath, "dist/index.js");

    console.log("👉 checking:", dir);

    if (!fs.existsSync(pkgJsonPath)) {
      console.warn("skip: no package.json");
      continue;
    }

    if (!fs.existsSync(entry)) {
      console.warn("skip: not built");
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
        skill = Object.values(mod).find(
          (v: any) => v && typeof v === "object" && "name" in v,
        );
      }

      if (!skill?.name) {
        console.warn("⚠️ invalid skill export:", mod);
        continue;
      }

      skills[skill.name] = skill;
      console.log("✅ loaded:", skill.name);
    } catch (err) {
      console.error("❌ import failed:", err);
    }
  }

  console.log("👉 loaded skills:", Object.keys(skills));

  return skills;
}
