"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSkill = runSkill;
const node_path_1 = __importDefault(require("node:path"));
const ANSI = {
    reset: '\u001B[0m',
    dim: '\u001B[2m',
    red: '\u001B[31m',
    yellow: '\u001B[33m',
    green: '\u001B[32m',
    cyan: '\u001B[36m',
    bold: '\u001B[1m',
};
function colorize(text, color) {
    return `${color}${text}${ANSI.reset}`;
}
function formatBadge(result) {
    if (!result.passed) {
        return colorize('🔴 FAIL', ANSI.red);
    }
    if (result.score >= 90) {
        return colorize('🟢 PASS', ANSI.green);
    }
    if (result.score >= 70) {
        return colorize('🟡 WARN', ANSI.yellow);
    }
    return colorize('🔴 FAIL', ANSI.red);
}
function formatMetaLine(label, value) {
    return `${colorize(label.padEnd(8), ANSI.cyan)} ${value}`;
}
function formatCheckStatus(check) {
    switch (check.status) {
        case 'pass':
            return colorize('PASS', ANSI.green);
        case 'warn':
            return colorize('WARN', ANSI.yellow);
        case 'fail':
        default:
            return colorize('FAIL', ANSI.red);
    }
}
function formatDuration(durationMs) {
    if (durationMs < 1000)
        return `${durationMs}ms`;
    if (durationMs < 60000)
        return `${(durationMs / 1000).toFixed(1)}s`;
    return `${Math.floor(durationMs / 60000)}m ${((durationMs % 60000) / 1000).toFixed(0)}s`;
}
function extractErrorMessage(output) {
    const errors = [];
    const referenceMatch = output.match(/ReferenceError:\s*([^\n]+)/);
    if (referenceMatch)
        errors.push(referenceMatch[1]);
    const typeErrorMatch = output.match(/TypeError:\s*([^\n]+)/);
    if (typeErrorMatch)
        errors.push(typeErrorMatch[1]);
    const syntaxErrorMatch = output.match(/SyntaxError:\s*([^\n]+)/);
    if (syntaxErrorMatch)
        errors.push(syntaxErrorMatch[1]);
    const babelMatch = output.match(/\[BABEL\].*?max of (\d+KB)/);
    if (babelMatch)
        errors.push(`Babel 编译警告：文件体积超过 ${babelMatch[1]}`);
    const deprecatedMatch = output.match(/deprecated\.\s*([^\n]+)/i);
    if (deprecatedMatch)
        errors.push(`已弃用：${deprecatedMatch[1]}`);
    if (errors.length > 0) {
        return errors.join('; ');
    }
    return output.slice(0, 200);
}
function parseIssueDetail(issue) {
    const testMatch = issue.match(/(test:\w+)\s+failed/i);
    if (testMatch) {
        const output = issue.split('Output:').pop()?.trim() || issue;
        const fileMatch = output.match(/([\w./-]+\.(test|spec)\.[jt]sx?)/i);
        const lineMatch = output.match(/:(\d+):\d+/);
        return {
            type: testMatch[1],
            message: extractErrorMessage(output),
            file: fileMatch?.[1],
            line: lineMatch ? parseInt(lineMatch[1]) : undefined,
        };
    }
    const lintMatch = issue.match(/(lint)\s+failed/i);
    if (lintMatch) {
        const output = issue.split('Output:').pop()?.trim() || issue;
        return { type: 'lint', message: extractErrorMessage(output) };
    }
    const buildMatch = issue.match(/(build)\s+failed/i);
    if (buildMatch) {
        const output = issue.split('Output:').pop()?.trim() || issue;
        return { type: 'build', message: extractErrorMessage(output) };
    }
    return { type: 'unknown', message: issue.slice(0, 200) };
}
function wrapMessage(message, maxLength = 80) {
    const lines = [];
    const trimmed = message.replace(/\s+/g, ' ').trim();
    let currentLine = '';
    const words = trimmed.split(' ');
    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxLength) {
            currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
        else {
            if (currentLine)
                lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine)
        lines.push(currentLine);
    return lines;
}
function printSkillReport(skill, result, ctx) {
    const heading = colorize(`${ANSI.bold}${skill.name}${ANSI.reset}`, ANSI.bold);
    console.log(`\n${heading}`);
    console.log(colorize('─'.repeat(Math.max(skill.name.length, 12)), ANSI.dim));
    console.log(formatMetaLine('Status', formatBadge(result)));
    console.log(formatMetaLine('Score', `${result.score}/100`));
    console.log(formatMetaLine('Project', node_path_1.default.resolve(ctx.projectPath)));
    if (ctx.changedFiles?.length) {
        console.log(formatMetaLine('Changed', `${ctx.changedFiles.length} file(s)`));
    }
    if (typeof result.durationMs === 'number') {
        console.log(formatMetaLine('Time', formatDuration(result.durationMs)));
    }
    if (result.summary) {
        console.log(`\n${result.summary}`);
    }
    if (result.checks?.length) {
        console.log(`\n${colorize('Checks', ANSI.bold)}`);
        result.checks.forEach(check => {
            const duration = typeof check.durationMs === 'number' ? ` (${formatDuration(check.durationMs)})` : '';
            const status = formatCheckStatus(check);
            console.log(`- ${check.label.padEnd(20)} ${status}${duration}`);
            if (check.details) {
                const lines = check.details.split('\n');
                lines.forEach((line, idx) => {
                    if (idx === 0) {
                        console.log(`  ${line}`);
                    }
                    else {
                        console.log(`    ${line}`);
                    }
                });
            }
        });
    }
    if (result.issues.length === 0) {
        console.log(`\n${colorize('✅ No issues found.', ANSI.green)}`);
    }
    else {
        console.log(`\n${colorize('❌ Issues Found', ANSI.bold)}`);
        console.log(colorize('─'.repeat(60), ANSI.dim));
        result.issues.forEach((issue, index) => {
            const parsed = parseIssueDetail(issue);
            const typeColor = parsed.type === 'test' ? ANSI.yellow :
                parsed.type === 'lint' ? ANSI.cyan :
                    parsed.type === 'build' ? ANSI.red : ANSI.dim;
            console.log(`\n${String(index + 1).padStart(2, ' ')}. ${colorize(`[${parsed.type.toUpperCase()}]`, typeColor)}`);
            const messageLines = wrapMessage(parsed.message, 70);
            messageLines.forEach((line, idx) => {
                if (idx === 0) {
                    console.log(`   └─ ${line}`);
                }
                else {
                    console.log(`      ${line}`);
                }
            });
            if (parsed.file) {
                const lineInfo = parsed.line ? `:${parsed.line}` : '';
                console.log(`   📁 ${colorize(`${parsed.file}${lineInfo}`, ANSI.dim)}`);
            }
        });
    }
    if (result.suggestions?.length) {
        console.log(`\n${colorize('💡 Suggestions', ANSI.bold)}`);
        console.log(colorize('─'.repeat(60), ANSI.dim));
        result.suggestions.forEach((suggestion, index) => {
            console.log(`\n${String(index + 1).padStart(2, ' ')}. ${colorize(suggestion.title, ANSI.green)}`);
            if (suggestion.detail) {
                console.log(`   └─ ${suggestion.detail}`);
            }
        });
    }
    console.log('');
}
async function runSkill(skill, ctx, options) {
    const resolvedContext = {
        projectPath: ctx?.projectPath ?? process.cwd(),
        changedFiles: ctx?.changedFiles,
        config: ctx?.config,
    };
    const result = await skill.run(resolvedContext);
    if (options?.output !== 'silent') {
        printSkillReport(skill, result, resolvedContext);
        console.log('');
    }
    if (!result.passed) {
        process.exitCode = 1;
    }
    return result;
}
