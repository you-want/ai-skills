export interface SkillContext {
    cwd: string;
}
export interface SkillResult {
    passed: boolean;
    score: number;
    issues: string[];
}
export interface Skill {
    name: string;
    description: string;
    run(ctx: SkillContext): Promise<SkillResult>;
}
