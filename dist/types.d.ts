export interface SkillContext {
    cwd: string;
}
export interface SkillResult {
    score: number;
    issues: string[];
}
export interface Skill {
    name: string;
    description: string;
    run(ctx: SkillContext): Promise<SkillResult>;
}
