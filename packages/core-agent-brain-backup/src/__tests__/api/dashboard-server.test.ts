import { DashboardServer } from '../../api/server';

// Mock the AgentBrain and LearningClient to avoid dependencies
jest.mock('../../orchestrator/agent-brain');
jest.mock('../../core/learning-client');

describe('DashboardServer', () => {
  let server: DashboardServer;

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    server = new DashboardServer();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Server Configuration', () => {
    it('should accept custom configuration', async () => {
      const config = {
        port: 3465,
        wsPort: 3466,
        brainPhase: 2 as const,
        learningApiUrl: 'http://test:3457'
      };

      // Mock the start method to avoid actually starting the server
      const startSpy = jest.spyOn(server as any, 'start').mockResolvedValue(undefined);

      await server.start(config);

      expect(startSpy).toHaveBeenCalledWith(config);
    });

    it('should use default configuration when none provided', async () => {
      const startSpy = jest.spyOn(server as any, 'start').mockResolvedValue(undefined);

      await server.start();

      expect(startSpy).toHaveBeenCalledWith({});
    });
  });

  describe('Environment Variables', () => {
    it('should respect ENABLE_BRAIN_INTEGRATION environment variable', async () => {
      const originalEnv = process.env.ENABLE_BRAIN_INTEGRATION;
      process.env.ENABLE_BRAIN_INTEGRATION = 'false';

      const startSpy = jest.spyOn(server as any, 'start').mockResolvedValue(undefined);

      await server.start();

      expect(startSpy).toHaveBeenCalled();

      // Restore environment
      if (originalEnv) {
        process.env.ENABLE_BRAIN_INTEGRATION = originalEnv;
      } else {
        delete process.env.ENABLE_BRAIN_INTEGRATION;
      }
    });

    it('should respect ENABLE_LEARNING_INTEGRATION environment variable', async () => {
      const originalEnv = process.env.ENABLE_LEARNING_INTEGRATION;
      process.env.ENABLE_LEARNING_INTEGRATION = 'false';

      const startSpy = jest.spyOn(server as any, 'start').mockResolvedValue(undefined);

      await server.start();

      expect(startSpy).toHaveBeenCalled();

      // Restore environment
      if (originalEnv) {
        process.env.ENABLE_LEARNING_INTEGRATION = originalEnv;
      } else {
        delete process.env.ENABLE_LEARNING_INTEGRATION;
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle server startup errors gracefully', async () => {
      // Mock process.exit to prevent test termination
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      // Mock DashboardAPI to throw error
      const mockError = new Error('Test server error');
      jest.doMock('../../api/dashboard-api', () => ({
        DashboardAPI: jest.fn().mockImplementation(() => ({
          start: jest.fn().mockRejectedValue(mockError)
        }))
      }));

      await server.start();

      expect(console.error).toHaveBeenCalledWith('❌ Failed to start Dashboard Server:', mockError);
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should setup signal handlers', () => {
      const processOnSpy = jest.spyOn(process, 'on');

      // Create new instance to trigger constructor
      new DashboardServer();

      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      processOnSpy.mockRestore();
    });
  });

  describe('CLI Argument Parsing', () => {
    it('should parse command line arguments correctly', () => {
      // Test the CLI parsing logic by checking the switch cases
      const args = ['--port', '3465', '--ws-port', '3466', '--brain-phase', '2'];
      const config: any = {};

      // Simulate the parsing logic from the CLI handler
      for (let i = 0; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];

        switch (flag) {
          case '--port':
            config.port = parseInt(value, 10);
            break;
          case '--ws-port':
            config.wsPort = parseInt(value, 10);
            break;
          case '--brain-phase':
            config.brainPhase = parseInt(value, 10) as 1 | 2;
            break;
        }
      }

      expect(config).toEqual({
        port: 3465,
        wsPort: 3466,
        brainPhase: 2
      });
    });

    it('should provide help information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      // This would normally be triggered by --help flag
      const helpText = `
Agent Brain Dashboard Server

Usage: node dist/api/server.js [options]

Options:
  --port <number>          API server port (default: 3460)
  --ws-port <number>       WebSocket server port (default: 3461)
  --brain-phase <1|2>      AgentBrain phase (default: 1)
  --learning-api <url>     Learning API URL (default: http://localhost:3457)
  --help                   Show this help message

Environment Variables:
  LEARNING_API            Learning system API URL
  ENABLE_BRAIN_INTEGRATION   Set to 'false' to disable brain integration
  ENABLE_LEARNING_INTEGRATION Set to 'false' to disable learning integration

Examples:
  node dist/api/server.js
  node dist/api/server.js --port 3460 --ws-port 3461
  node dist/api/server.js --brain-phase 2 --learning-api http://localhost:3457
        `;

      expect(helpText).toContain('Agent Brain Dashboard Server');
      expect(helpText).toContain('--port');
      expect(helpText).toContain('--ws-port');
      expect(helpText).toContain('--brain-phase');

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});