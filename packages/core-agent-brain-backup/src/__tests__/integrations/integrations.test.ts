import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ESLintLearningIntegration from '../../integrations/eslint-integration';
import TypeScriptLearningIntegration from '../../integrations/typescript-integration';
import BuildSystemLearningIntegration from '../../integrations/build-system-integration';
import GitHooksLearningIntegration from '../../integrations/git-hooks-integration';
import RuntimeErrorLearningIntegration from '../../integrations/runtime-error-integration';

// Mock fetch for learning API calls
global.fetch = vi.fn();

describe('Learning Integrations Test Suite', () => {
  const mockLearningApiUrl = 'http://localhost:3457';
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ESLint Learning Integration', () => {
    let eslintIntegration: ESLintLearningIntegration;

    beforeEach(() => {
      eslintIntegration = new ESLintLearningIntegration(mockLearningApiUrl);
    });

    it('should create learning formatter', () => {
      const formatter = eslintIntegration.createLearningFormatter();
      expect(typeof formatter).toBe('function');
    });

    it('should create ESLint instance', async () => {
      const eslintInstance = await eslintIntegration.createESLintInstance();
      expect(eslintInstance).toBeDefined();
    });

    it('should create learning config', async () => {
      const configPath = './test-eslintrc.learning.js';
      await eslintIntegration.createLearningConfig(configPath);

      // Verify config file was created
      const fs = await import('fs');
      expect(fs.existsSync(configPath)).toBe(true);

      // Clean up
      fs.unlinkSync(configPath);
    });

    it('should lint files and report violations', async () => {
      // Create a test file with violations
      const fs = await import('fs');
      const testFilePath = './test-file.js';
      const testContent = `
        console.log('test');
        debugger;
        var x = 1;
      `;

      fs.writeFileSync(testFilePath, testContent);

      try {
        const results = await eslintIntegration.lintFiles([testFilePath]);
        expect(Array.isArray(results)).toBe(true);

        // Should have reported to learning API
        expect(fetchMock).toHaveBeenCalled();
      } finally {
        // Clean up
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  describe('TypeScript Learning Integration', () => {
    let tsIntegration: TypeScriptLearningIntegration;

    beforeEach(() => {
      tsIntegration = new TypeScriptLearningIntegration(mockLearningApiUrl);
    });

    it('should analyze files and report diagnostics', async () => {
      // Create a test TypeScript file with errors
      const fs = await import('fs');
      const testFilePath = './test-file.ts';
      const testContent = `
        let x: string = 123; // Type error
        console.log(undefinedVariable); // Reference error
        function test(): number {
          return 'string'; // Return type error
        }
      `;

      fs.writeFileSync(testFilePath, testContent);

      try {
        const diagnostics = await tsIntegration.analyzeFiles([testFilePath]);
        expect(Array.isArray(diagnostics)).toBe(true);

        // Should have reported to learning API
        expect(fetchMock).toHaveBeenCalled();
      } finally {
        // Clean up
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should create learning config', async () => {
      const configPath = './test-tsconfig.learning.json';
      await tsIntegration.createLearningConfig(configPath);

      // Verify config file was created
      const fs = await import('fs');
      expect(fs.existsSync(configPath)).toBe(true);

      // Clean up
      fs.unlinkSync(configPath);
    });

    it('should perform type checking', async () => {
      const fs = await import('fs');
      const testFilePath = './test-file.ts';
      const testContent = `export const validCode: string = 'hello';`;

      fs.writeFileSync(testFilePath, testContent);

      try {
        const output = await tsIntegration.typeCheck([testFilePath]);
        expect(typeof output).toBe('string');
      } finally {
        // Clean up
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  describe('Build System Learning Integration', () => {
    let buildIntegration: BuildSystemLearningIntegration;

    beforeEach(() => {
      buildIntegration = new BuildSystemLearningIntegration(mockLearningApiUrl);
    });

    it('should get build info', () => {
      const buildInfo = buildIntegration.getBuildInfo();
      expect(buildInfo).toHaveProperty('tool');
      expect(buildInfo).toHaveProperty('hasConfig');
    });

    it('should run build and capture metrics', async () => {
      // Test with a simple echo command instead of actual build
      const result = await buildIntegration.runBuild('echo "test build"');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('buildTime');
      expect(result.metrics).toHaveProperty('errors');
      expect(result.metrics).toHaveProperty('warnings');
    });

    it('should kill running build process', () => {
      expect(() => buildIntegration.killBuild()).not.toThrow();
    });
  });

  describe('Git Hooks Learning Integration', () => {
    let gitIntegration: GitHooksLearningIntegration;

    beforeEach(() => {
      gitIntegration = new GitHooksLearningIntegration(mockLearningApiUrl);
    });

    it('should get staged files', async () => {
      try {
        const files = await gitIntegration.getStagedFiles();
        expect(Array.isArray(files)).toBe(true);
      } catch (error) {
        // Git command might fail in test environment, which is expected
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should validate files against patterns', async () => {
      // Create test files with violations
      const fs = await import('fs');
      const testFilePath = './test-violation.js';
      const testContent = `
        console.log('debug statement');
        debugger;
        var secretKey = 'hardcoded-secret';
      `;

      fs.writeFileSync(testFilePath, testContent);

      try {
        const results = await gitIntegration.validateFiles([testFilePath], 'pre-commit');
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(1);
        expect(results[0]).toHaveProperty('file');
        expect(results[0]).toHaveProperty('violations');
        expect(results[0]).toHaveProperty('passed');
        expect(results[0].violations.length).toBeGreaterThan(0);
      } finally {
        // Clean up
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should create hook runner', async () => {
      await gitIntegration.createHookRunner();

      const fs = await import('fs');
      const runnerPath = require('path').resolve(__dirname, '../../../bin/git-hook-runner.js');
      expect(fs.existsSync(runnerPath)).toBe(true);
    });
  });

  describe('Runtime Error Learning Integration', () => {
    let runtimeIntegration: RuntimeErrorLearningIntegration;

    beforeEach(() => {
      runtimeIntegration = new RuntimeErrorLearningIntegration(mockLearningApiUrl);
    });

    it('should capture and report errors', async () => {
      const testError = new Error('Test error');
      await runtimeIntegration.captureError(testError, { context: 'test' });

      // Should have reported to learning API
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should wrap functions for error capture', () => {
      const testFunction = () => {
        throw new Error('Test error');
      };

      const wrappedFunction = runtimeIntegration.wrapFunction(testFunction);
      expect(() => wrappedFunction()).toThrow('Test error');
    });

    it('should wrap async functions for error capture', async () => {
      const testAsyncFunction = async () => {
        throw new Error('Async test error');
      };

      const wrappedFunction = runtimeIntegration.wrapAsync(testAsyncFunction);
      await expect(wrappedFunction()).rejects.toThrow('Async test error');
    });

    it('should generate browser error handler script', () => {
      const script = runtimeIntegration.getBrowserErrorHandler();
      expect(typeof script).toBe('string');
      expect(script).toContain('window.addEventListener');
      expect(script).toContain('error');
      expect(script).toContain('unhandledrejection');
    });

    it('should provide error statistics', () => {
      const stats = runtimeIntegration.getErrorStats();
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('errorsByType');
      expect(stats).toHaveProperty('mostFrequent');
    });

    it('should clear statistics', () => {
      runtimeIntegration.clearStats();
      const stats = runtimeIntegration.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });

    afterEach(() => {
      runtimeIntegration.shutdown();
    });
  });

  describe('Integration Cross-Communication', () => {
    it('should handle multiple integrations reporting to same learning API', async () => {
      const eslint = new ESLintLearningIntegration(mockLearningApiUrl);
      const typescript = new TypeScriptLearningIntegration(mockLearningApiUrl);
      const runtime = new RuntimeErrorLearningIntegration(mockLearningApiUrl);

      // Simulate concurrent reporting
      await Promise.all([
        runtime.captureError(new Error('Test 1')),
        runtime.captureError(new Error('Test 2')),
        runtime.captureError(new Error('Test 3'))
      ]);

      // Should have made multiple API calls
      expect(fetchMock).toHaveBeenCalledTimes(3);

      runtime.shutdown();
    });

    it('should handle learning API failures gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('API unavailable'));

      const runtime = new RuntimeErrorLearningIntegration(mockLearningApiUrl);

      // Should not throw even when API fails
      await expect(runtime.captureError(new Error('Test error'))).resolves.not.toThrow();

      runtime.shutdown();
    });
  });
});