const defaultConfig = {
  skills: {
    'ship-safe': {
      testScripts: ['test', 'test:unit', 'test:integration', 'test:e2e'],
      qualityScripts: ['lint', 'typecheck', 'build', 'check', 'verify'],
      requireRepoTests: true,
      requireStagedTestFiles: true,
      requireMatchingTestsForChangedFiles: true,
    },
  },
}

export default defaultConfig
