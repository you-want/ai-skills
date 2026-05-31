import { Skill, SkillContext, SkillResult, Issue } from "@ai-skills/core";

const skill: Skill = {
  name: "example-skill",
  description: "技能模板示例",
  version: "1.0.0",

  async run(ctx: SkillContext): Promise<SkillResult> {
    const issues: Issue[] = [];

    // 示例：检查一些问题
    // issues.push({
    //   severity: "warning",
    //   category: "example",
    //   message: "这是一个警告示例",
    //   path: "src/example.ts",
    //   line: 1
    // });

    return {
      status: issues.length === 0 ? "pass" : "fail",
      score: issues.length === 0 ? 100 : 50,
      checks: [
        { name: "Example Check", pass: true, message: "检查示例" }
      ],
      issues,
      suggestions: []
    };
  }
};

export default skill;
