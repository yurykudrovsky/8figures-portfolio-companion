module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Increase timeout for SSE streaming tests (stream runs at 15ms per char;
  // a typical response is ~200 chars — allow 10 seconds to be safe)
  testTimeout: 10000,
};
