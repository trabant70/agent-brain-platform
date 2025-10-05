import request from 'supertest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import { DashboardAPI } from '../../api/dashboard-api';

describe('DashboardAPI', () => {
  let api: DashboardAPI;
  let server: any;
  let ioServer: SocketIOServer;
  let clientSocket: any;
  const testPort = 3464;

  beforeAll(async () => {
    // Create API instance without AgentBrain/Learning dependencies for isolated testing
    api = new DashboardAPI();

    // Get the Express app
    const app = (api as any).app;
    server = createServer(app);

    // Start HTTP server first
    await new Promise<void>((resolve) => {
      server.listen(testPort, resolve);
    });

    // Set the server reference for WebSocket setup
    (api as any).server = server;

    // Setup WebSocket
    ioServer = api.setupWebSocket(testPort);

    // Create client socket for WebSocket tests
    clientSocket = Client(`http://localhost:${testPort}`);
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (ioServer) {
      ioServer.close();
    }
    if (server) {
      server.close();
    }
  });

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          brain: false,
          learning: false
        }
      });
    });
  });

  describe('Pattern Endpoints', () => {
    it('should get all patterns', async () => {
      const response = await request(server)
        .get('/api/patterns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify pattern structure
      const pattern = response.body.data[0];
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('category');
      expect(pattern).toHaveProperty('description');
      expect(pattern).toHaveProperty('content');
      expect(pattern).toHaveProperty('metadata');
      expect(pattern).toHaveProperty('metrics');
      expect(pattern).toHaveProperty('status');
    });

    it('should get a single pattern', async () => {
      const response = await request(server)
        .get('/api/patterns/pattern-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'pattern-1');
    });

    it('should update a pattern', async () => {
      const updateData = {
        description: 'Updated description',
        metadata: {
          tags: ['updated', 'test']
        }
      };

      const response = await request(server)
        .put('/api/patterns/pattern-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'pattern-1',
        ...updateData
      });
    });

    it('should create a pattern version', async () => {
      const versionData = {
        message: 'Test version',
        content: { updated: true }
      };

      const response = await request(server)
        .post('/api/patterns/pattern-1/version')
        .send(versionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('pattern_id', 'pattern-1');
      expect(response.body.data).toHaveProperty('message', 'Test version');
      expect(response.body.data).toHaveProperty('content', { updated: true });
    });

    it('should get pattern versions', async () => {
      const response = await request(server)
        .get('/api/patterns/pattern-1/versions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get pattern diff', async () => {
      const response = await request(server)
        .get('/api/patterns/pattern-1/diff?from=1&to=2')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Learning Endpoints', () => {
    it('should get learning sources', async () => {
      const response = await request(server)
        .get('/api/learning/sources')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify learning source structure
      const source = response.body.data[0];
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('name');
      expect(source).toHaveProperty('type');
      expect(source).toHaveProperty('status');
      expect(source).toHaveProperty('config');
      expect(source).toHaveProperty('metrics');
    });

    it('should get learning activity', async () => {
      const response = await request(server)
        .get('/api/learning/activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should submit manual learning', async () => {
      const learningData = {
        type: 'manual',
        pattern: 'test-pattern',
        description: 'Test learning submission'
      };

      const response = await request(server)
        .post('/api/learning/manual')
        .send(learningData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Learning submitted successfully');
    });
  });

  describe('Project Intelligence Endpoints', () => {
    it('should get project status', async () => {
      const response = await request(server)
        .get('/api/project/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('healthy');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('implementation');
      expect(response.body.data).toHaveProperty('coverage');
    });

    it('should get architecture', async () => {
      const response = await request(server)
        .get('/api/project/architecture')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify service node structure
      const service = response.body.data[0];
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('type');
      expect(service).toHaveProperty('status');
      expect(service).toHaveProperty('health');
      expect(service).toHaveProperty('dependencies');
      expect(service).toHaveProperty('position');
    });

    it('should query project with natural language', async () => {
      const queryData = {
        query: 'What services are failing?'
      };

      const response = await request(server)
        .post('/api/project/query')
        .send(queryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('query', queryData.query);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('confidence');
    });
  });

  describe('Analytics Endpoints', () => {
    it('should get effectiveness metrics', async () => {
      const response = await request(server)
        .get('/api/analytics/effectiveness')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('preventionRate');
      expect(response.body.data).toHaveProperty('falsePositiveRate');
      expect(response.body.data).toHaveProperty('learningVelocity');
      expect(response.body.data).toHaveProperty('crossServiceImpact');
      expect(response.body.data).toHaveProperty('totalPatterns');
      expect(response.body.data).toHaveProperty('activePatterns');
      expect(response.body.data).toHaveProperty('deprecatedPatterns');
    });

    it('should get usage stats', async () => {
      const response = await request(server)
        .get('/api/analytics/usage')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should get impact metrics', async () => {
      const response = await request(server)
        .get('/api/analytics/impact')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      await request(server)
        .get('/api/unknown')
        .expect(404);
    });

    it('should handle malformed JSON in requests', async () => {
      const response = await request(server)
        .post('/api/learning/manual')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight requests', async () => {
      await request(server)
        .options('/api/patterns')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
    });
  });

  describe('WebSocket Functionality', () => {
    it('should handle WebSocket connections', (done) => {
      const testSocket = Client(`http://localhost:3464`);

      testSocket.on('connect', () => {
        expect(testSocket.connected).toBe(true);
        testSocket.close();
        done();
      });
    });

    it('should handle pattern validation requests', (done) => {
      const testPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        content: 'test content'
      };

      clientSocket.on('validation-result', (data: any) => {
        expect(data.type).toBe('validation-result');
        expect(data.payload).toHaveProperty('valid');
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('validate-pattern', testPattern);
    });

    it('should emit real-time updates on pattern changes', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('pattern-updated', (data: any) => {
          expect(data.type).toBe('pattern-updated');
          expect(data.payload).toHaveProperty('id', 'pattern-1');
          expect(data.timestamp).toBeDefined();
          resolve(data);
        });
      });

      // Trigger pattern update
      await request(server)
        .put('/api/patterns/pattern-1')
        .send({ description: 'Updated for WebSocket test' })
        .expect(200);

      await updatePromise;
    });
  });

  describe('Request Logging', () => {
    it('should log API requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(server)
        .get('/health')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] GET \/health/)
      );

      consoleSpy.mockRestore();
    });
  });
});