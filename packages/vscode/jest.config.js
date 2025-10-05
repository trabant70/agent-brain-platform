/**
 * Jest Configuration for VSCode Extension Testing
 * Comprehensive test setup for Repository Timeline Extension
 */

module.exports = {
  // Test environment configuration
  testEnvironment: 'node',

  // Root directories for tests
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },

  // Module name mapping for imports and mocks
  moduleNameMapper: {
    '^vscode$': '<rootDir>/tests/mocks/vscode.mock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.ts'
  ],

  // Coverage configuration
  collectCoverage: false, // Only collect when --coverage flag is used
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/index.{ts,tsx}'
  ],

  // Coverage thresholds - Enhanced with GitHub provider support
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/data/providers/git/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/data/providers/github/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/orchestration/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/visualization/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },

  // Coverage reporters - Enhanced with HTML and XML output
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'cobertura',
    'json-summary'
  ],

  // Enhanced reporters for CI/CD (disabled until packages are installed)
  // reporters: [
  //   'default',
  //   ['jest-html-reporter', {
  //     pageTitle: 'Timeline Extension Test Report',
  //     outputPath: './test-results/index.html',
  //     includeFailureMsg: true,
  //     includeSuiteFailure: true
  //   }],
  //   ['jest-junit', {
  //     outputDirectory: './test-results',
  //     outputName: 'junit.xml',
  //     classNameTemplate: '{classname}',
  //     titleTemplate: '{title}',
  //     ancestorSeparator: ' › ',
  //     usePathForSuiteName: 'true'
  //   }]
  // ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }
  },

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Mock reset configuration
  resetMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(d3|d3-.*)/)'
  ],

  // Module path ignore patterns
  modulePathIgnorePatterns: [
    '<rootDir>/analysis/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Test categories through projects
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts']
    },
    {
      displayName: 'Pathway Tests',
      testMatch: ['<rootDir>/tests/pathways/generated/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/pathway-setup.ts']
    },
    {
      displayName: 'Pathway Unit Tests',
      testMatch: ['<rootDir>/tests/pathways/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/pathway-setup.ts']
    },
    {
      displayName: 'Pathway Integration Tests',
      testMatch: ['<rootDir>/tests/pathways/integration/**/*.test.ts'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/pathway-integration-setup.ts'],
      moduleNameMapper: {
        '^vscode$': '<rootDir>/tests/mocks/vscode.mock.ts',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
      }
    },
    {
      displayName: 'Pathway Performance Tests',
      testMatch: ['<rootDir>/tests/pathways/performance/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/pathway-setup.ts']
    }
  ],

  // Watch configuration for development
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ]
};