import type { Skill } from '@ai-skills/core';
interface PackageJson {
    scripts?: Record<string, string>;
}
interface ValidationCommand {
    name: string;
    kind: 'test' | 'quality';
    command: string[];
}
type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';
declare function detectPackageManager(cwd: string): PackageManager;
declare function readPackageJson(cwd: string): PackageJson | null;
declare function buildValidationCommands(scripts: Record<string, string>, packageManager: PackageManager): ValidationCommand[];
declare function isSourceFile(filePath: string): boolean;
declare function isTestFile(filePath: string): boolean;
declare function hasMatchingTest(sourceFile: string, tests: string[]): boolean;
declare function findUntestedSources(sourceFiles: string[], tests: string[]): string[];
declare const shipSafe: Skill;
export declare const __internals: {
    buildValidationCommands: typeof buildValidationCommands;
    detectPackageManager: typeof detectPackageManager;
    findUntestedSources: typeof findUntestedSources;
    hasMatchingTest: typeof hasMatchingTest;
    isSourceFile: typeof isSourceFile;
    isTestFile: typeof isTestFile;
    readPackageJson: typeof readPackageJson;
};
export default shipSafe;
