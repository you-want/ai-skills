"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.loadConfig = loadConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
exports.defaultConfig = {
    skills: {
        'ship-safe': {
            testScripts: ['test', 'test:unit', 'test:integration', 'test:e2e'],
            qualityScripts: ['lint', 'typecheck', 'build', 'check', 'verify'],
            requireRepoTests: true,
            requireStagedTestFiles: true,
            requireMatchingTestsForChangedFiles: true,
        },
    },
};
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function mergeRecords(base, override) {
    const next = { ...base };
    for (const [key, value] of Object.entries(override)) {
        const current = next[key];
        if (isObject(current) && isObject(value)) {
            next[key] = mergeRecords(current, value);
            continue;
        }
        next[key] = value;
    }
    return next;
}
async function readConfigFile(configFilePath) {
    if (configFilePath.endsWith('.json')) {
        return JSON.parse(node_fs_1.default.readFileSync(configFilePath, 'utf8'));
    }
    const imported = await import(`${(0, node_url_1.pathToFileURL)(configFilePath).href}?t=${Date.now()}`);
    const rawConfig = imported.default ?? imported;
    return rawConfig;
}
function findConfigPath(projectPath) {
    const candidates = [
        'ai-skills.config.json',
        'ai-skills.config.js',
        'ai-skills.config.mjs',
        'ai-skills.config.cjs',
    ];
    for (const candidate of candidates) {
        const candidatePath = node_path_1.default.join(projectPath, candidate);
        if (node_fs_1.default.existsSync(candidatePath)) {
            return candidatePath;
        }
    }
    return undefined;
}
async function loadConfig(options) {
    const resolvedConfigPath = options.configPath
        ? node_path_1.default.resolve(options.projectPath, options.configPath)
        : findConfigPath(options.projectPath);
    if (!resolvedConfigPath) {
        return exports.defaultConfig;
    }
    const loaded = await readConfigFile(resolvedConfigPath);
    return mergeRecords(exports.defaultConfig, loaded);
}
