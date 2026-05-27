import { AiSkillsConfig } from './types.js';
export declare const defaultConfig: AiSkillsConfig;
export interface LoadConfigOptions {
    configPath?: string;
    projectPath: string;
}
export declare function loadConfig(options: LoadConfigOptions): Promise<AiSkillsConfig>;
