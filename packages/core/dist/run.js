"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSkill = runSkill;
async function runSkill(skill) {
    const result = await skill.run({
        cwd: process.cwd(),
    });
    console.log(`\n📊 ${skill.name} Report`);
    console.log('----------------------');
    console.log(`Status: ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Score: ${result.score}`);
    if (result.issues.length) {
        console.log('\nIssues:');
        result.issues.forEach(i => console.log('- ' + i));
    }
    else {
        console.log('\nNo issues 🎉');
    }
    console.log('\n');
    if (!result.passed) {
        process.exitCode = 1;
    }
    return result;
}
