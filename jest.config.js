module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  // Only measure shipped code; Sonar reads coverage/lcov.info.
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['lcov', 'text-summary'],
};
