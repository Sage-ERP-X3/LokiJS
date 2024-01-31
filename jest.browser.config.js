module.exports = {
    roots: ['<rootDir>'],
    testMatch: ['<rootDir>/spec/generic/**/*spec.js','<rootDir>/spec/browser/**/*spec.js'],
    testEnvironment: 'jsdom',
    verbose: true,
    reporters: ['default'],
    collectCoverageFrom: [
        '<rootDir>/src/**/*.js',
    ],
    coverageReporters: ['json', 'lcov', 'text', 'clover', 'cobertura'],
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/build/',
    ],
    coveragePathIgnorePatterns: [
        '<rootDir>/spec/',
        '<rootDir>/node_modules/',
        '<rootDir>/build/',
    ],
};
