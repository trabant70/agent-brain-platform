import { createServer } from 'http';
import { AddressInfo } from 'net';
import Client from 'socket.io-client';
import { AgentBrainWebSocket } from '../../api/websocket';
import { LearningPattern, TestFailure, LearningMetrics } from '../../learning';

describe('AgentBrainWebSocket', () => {
  let websocket: AgentBrainWebSocket;
  let server: any;
  let clientSocket: any;
  let serverPort: number;

  beforeAll(async () => {
    // Create HTTP server
    server = createServer();

    // Initialize WebSocket
    websocket = new AgentBrainWebSocket();
    websocket.initialize(server);

    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(() => {
        serverPort = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await websocket.shutdown();
    server.close();
  });

  beforeEach(async () => {
    clientSocket = Client(`http://localhost:${serverPort}`);

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should handle client connections', async () => {
      expect(websocket.getConnectionCount()).toBe(1);
      expect(websocket.isConnected()).toBe(true);
      expect(websocket.getConnectedClients()).toHaveLength(1);
    });

    it('should emit dashboard-connected on connection', (done) => {
      const newClient = Client(`http://localhost:${serverPort}`);

      newClient.on('dashboard-connected', () => {
        newClient.disconnect();
        done();
      });
    });

    it('should handle client disconnections', (done) => {
      const initialCount = websocket.getConnectionCount();

      clientSocket.disconnect();

      setTimeout(() => {
        expect(websocket.getConnectionCount()).toBe(initialCount - 1);
        done();
      }, 100);
    });
  });

  describe('Learning System Events', () => {
    it('should broadcast pattern discovered', (done) => {
      const mockPattern: LearningPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        description: 'A test pattern',
        category: 'code-quality',
        severity: 'warning',
        trigger: /test/,
        message: 'Test message'
      };

      clientSocket.on('pattern-discovered', (pattern: LearningPattern) => {
        expect(pattern.id).toBe('test-pattern');
        expect(pattern.name).toBe('Test Pattern');
        done();
      });

      websocket.broadcastPatternDiscovered(mockPattern);
    });

    it('should broadcast pattern applied', (done) => {
      clientSocket.on('pattern-applied', (patternId: string, file: string) => {
        expect(patternId).toBe('test-pattern');
        expect(file).toBe('test.ts');
        done();
      });

      websocket.broadcastPatternApplied('test-pattern', 'test.ts');
    });

    it('should broadcast failure processed', (done) => {
      const mockFailure: TestFailure = {
        test: 'Test failure',
        error: 'Something went wrong',
        file: 'test.ts',
        context: { timestamp: new Date() }
      };

      clientSocket.on('failure-processed', (failure: TestFailure) => {
        expect(failure.test).toBe('Test failure');
        expect(failure.error).toBe('Something went wrong');
        done();
      });

      websocket.broadcastFailureProcessed(mockFailure);
    });

    it('should broadcast metrics updated', (done) => {
      const mockMetrics: LearningMetrics = {
        totalPatterns: 5,
        totalOccurrences: 10,
        avgConfidenceScore: 0.8,
        topCategories: [{ category: 'code-quality', count: 3 }],
        recentPatterns: []
      };

      clientSocket.on('metrics-updated', (metrics: LearningMetrics) => {
        expect(metrics.totalPatterns).toBe(5);
        expect(metrics.avgConfidenceScore).toBe(0.8);
        done();
      });

      websocket.broadcastMetricsUpdated(mockMetrics);
    });
  });

  describe('Extension Events', () => {
    it('should broadcast extension loaded', (done) => {
      clientSocket.on('extension-loaded', (extensionName: string) => {
        expect(extensionName).toBe('test-extension');
        done();
      });

      websocket.broadcastExtensionLoaded('test-extension');
    });

    it('should broadcast extension error', (done) => {
      clientSocket.on('extension-error', (extensionName: string, error: string) => {
        expect(extensionName).toBe('test-extension');
        expect(error).toBe('Test error');
        done();
      });

      websocket.broadcastExtensionError('test-extension', 'Test error');
    });
  });

  describe('Analysis Events', () => {
    it('should broadcast analysis started', (done) => {
      clientSocket.on('analysis-started', (context: any) => {
        expect(context.files).toEqual(['test.ts']);
        expect(context.type).toBe('manual');
        done();
      });

      websocket.broadcastAnalysisStarted({ files: ['test.ts'], type: 'manual' });
    });

    it('should broadcast analysis completed', (done) => {
      clientSocket.on('analysis-completed', (result: any) => {
        expect(result.patterns).toBe(3);
        expect(result.suggestions).toBe(5);
        done();
      });

      websocket.broadcastAnalysisCompleted({ patterns: 3, suggestions: 5 });
    });
  });

  describe('Client Requests', () => {
    it('should handle get-patterns requests', (done) => {
      clientSocket.emit('get-patterns', (patterns: LearningPattern[]) => {
        expect(Array.isArray(patterns)).toBe(true);
        done();
      });
    });

    it('should handle get-metrics requests', (done) => {
      clientSocket.emit('get-metrics', (metrics: LearningMetrics) => {
        expect(typeof metrics).toBe('object');
        expect(metrics.totalPatterns).toBeDefined();
        done();
      });
    });

    it('should handle trigger-analysis requests', (done) => {
      clientSocket.on('analysis-started', (context: any) => {
        expect(context.files).toEqual(['test.ts']);
        expect(context.type).toBe('manual');
        done();
      });

      clientSocket.emit('trigger-analysis', ['test.ts']);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await websocket.healthCheck();

      expect(health.connected).toBe(true);
      expect(health.clients).toBeGreaterThan(0);
      expect(health.uptime).toBeGreaterThan(0);
    });
  });

  describe('System Status', () => {
    it('should broadcast system status', (done) => {
      const status = {
        learning: true,
        extensions: 2,
        patterns: 5,
        uptime: 1000
      };

      clientSocket.on('system-status', (receivedStatus: any) => {
        expect(receivedStatus.learning).toBe(true);
        expect(receivedStatus.extensions).toBe(2);
        done();
      });

      websocket.broadcastSystemStatus(status);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should notify clients of shutdown', (done) => {
      const testWebSocket = new AgentBrainWebSocket();
      const testServer = createServer();
      testWebSocket.initialize(testServer);

      testServer.listen(() => {
        const port = (testServer.address() as AddressInfo).port;
        const testClient = Client(`http://localhost:${port}`);

        testClient.on('connect', async () => {
          testClient.on('system-shutdown', (data: any) => {
            expect(data.message).toBe('Agent Brain is shutting down');
            expect(data.timestamp).toBeDefined();
            testClient.disconnect();
            testServer.close();
            done();
          });

          await testWebSocket.shutdown();
        });
      });
    });
  });
});