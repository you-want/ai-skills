export async function runSkill(skill) {
    const result = await skill.run({
        cwd: process.cwd(),
    });
    console.log(`\n📊 ${skill.name} Report`);
    console.log('----------------------');
    console.log(`Score: ${result.score}`);
    if (result.issues.length) {
        console.log('\nIssues:');
        result.issues.forEach(i => console.log('- ' + i));
    }
    else {
        console.log('\nNo issues 🎉');
    }
    console.log('\n');
}
