import { Skill, SkillContext, SkillResult } from './types.js';
export interface RunSkillOptions {
    output?: 'text' | 'silent';
}
export declare function runSkill(skill: Skill, ctx?: Partial<SkillContext>, options?: RunSkillOptions): Promise<SkillResult>;
