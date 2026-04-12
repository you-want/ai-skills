export const shipSafe = {
    name: 'ship-safe',
    description: 'Check if your code is safe to deploy',
    async run() {
        const issues = [
            'Missing error handling in API',
            'Possible async race condition'
        ];
        return {
            score: 75,
            issues
        };
    }
};
