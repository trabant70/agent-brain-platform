import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { LearningSystem, LearningPattern, LearningMetrics } from '../learning';
import { PatternSystem } from '../patterns';
import { Pattern } from './types';

// Extended interfaces for dashboard-specific data structures
interface DashboardPattern extends Pattern {
  content: {
    problem: string;
    solution: string;
    examples: any[];
    antipatterns: any[];
    verification: any[];
  };
  metadata: {
    author: string;
    version: string;
    lastUpdated: Date;
    tags: string[];
    source: string;
    confidence: number;
  };
  metrics: {
    usageCount: number;
    effectiveness: number;
    impact: 'high' | 'medium' | 'low';
  };
  status: string;
}
import { AgentBrainWebSocket } from './websocket';

// Interface for mock learning sources
interface LearningSource {
  id: string;
  name: string;
  type: string;
  status: string;
  lastUpdate?: string;
  config?: any;
  metrics?: {
    patternsLearned: number;
    successRate: number;
    avgProcessingTime: number;
    lastActivity: Date;
  };
}

// Interface for mock service nodes
interface ServiceNode {
  id: string;
  name: string;
  type?: string;
  status: string;
  health?: string;
  cpu?: number;
  memory?: number;
  uptime?: string;
  dependencies?: string[];
  metrics?: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  position?: { x: number; y: number };
}

export interface DashboardAPIOptions {
  port?: number;
  wsPort?: number;
  corsOrigin?: string | string[];
}

export class DashboardAPI {
  private app: Express;
  private server: any;
  private io?: SocketIOServer;
  private websocket?: AgentBrainWebSocket;
  private learningSystem?: LearningSystem;
  private patternSystem?: PatternSystem;
  private brain?: any; // For backwards compatibility - can be AgentBrainCore
  private learningClient?: LearningSystem; // Alias for learningSystem

  constructor(
    learningSystem?: LearningSystem,
    patternSystem?: PatternSystem
  ) {
    this.learningSystem = learningSystem;
    this.patternSystem = patternSystem;
    // Set compatibility aliases
    this.learningClient = learningSystem;
    this.brain = null; // Will be set later if needed
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // CORS configuration
    this.app?.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }));

    // JSON parsing
    this.app?.use(express.json({ limit: '10mb' }));
    this.app?.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app?.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app?.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          brain: !!this.brain,
          learning: !!this.learningClient
        }
      });
    });

    // Pattern endpoints
    this.app?.get('/api/patterns', this.getPatterns?.bind(this));
    this.app?.get('/api/patterns/:id', this.getPattern?.bind(this));
    this.app?.put('/api/patterns/:id', this.updatePattern?.bind(this));
    this.app?.post('/api/patterns/:id/version', this.createVersion?.bind(this));
    this.app?.get('/api/patterns/:id/versions', this.getVersions?.bind(this));
    this.app?.get('/api/patterns/:id/diff', this.getDiff?.bind(this));

    // Learning endpoints
    this.app?.get('/api/learning/sources', this.getLearningSources?.bind(this));
    this.app?.get('/api/learning/activity', this.getLearningActivity?.bind(this));
    this.app?.post('/api/learning/manual', this.manualLearn?.bind(this));

    // Project intelligence endpoints
    this.app?.get('/api/project/status', this.getProjectStatus?.bind(this));
    this.app?.get('/api/project/architecture', this.getArchitecture?.bind(this));
    this.app?.post('/api/project/query', this.queryProject?.bind(this));

    // Analytics endpoints
    this.app?.get('/api/analytics/effectiveness', this.getEffectiveness?.bind(this));
    this.app?.get('/api/analytics/usage', this.getUsageStats?.bind(this));
    this.app?.get('/api/analytics/impact', this.getImpactMetrics?.bind(this));

    // Catch-all error handler
    this.app?.use((err: Error, req: Request, res: Response, next: any) => {
      console.error('API Error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error'
      });
    });
  }

  // Pattern API methods
  private async getPatterns(req: Request, res: Response) {
    try {
      // Mock data for now - will integrate with real brain data
      const patterns: DashboardPattern[] = [
        {
          id: 'pattern-1',
          name: 'Async Error Handling',
          category: 'golden-path',
          description: 'Best practices for handling async operations with proper error boundaries',
          trigger: /async.*await.*(?!try)/,
          message: 'Consider wrapping async operations in try-catch blocks',
          severity: 'warning' as const,
          content: {
            problem: 'Unhandled promise rejections causing application crashes',
            solution: 'Use try-catch blocks with async/await and global error handlers',
            examples: [],
            antipatterns: [],
            verification: []
          },
          metadata: {
            author: 'agent-brain',
            version: '1.0.0',
            lastUpdated: new Date(),
            tags: ['async', 'error-handling', 'typescript'],
            source: 'jest',
            confidence: 0.94
          },
          metrics: {
            usageCount: 156,
            effectiveness: 0.94,
            impact: 'high' as const
          },
          status: 'active'
        },
        {
          id: 'pattern-2',
          name: 'Service Authentication',
          category: 'adr',
          description: 'Authentication patterns for microservice communication',
          trigger: /fetch.*\/api\/.*(?!authorization)/i,
          message: 'API calls should include authentication headers',
          severity: 'error' as const,
          content: {
            problem: 'Secure service-to-service communication requirements',
            solution: 'JWT-based authentication with service accounts',
            examples: [],
            antipatterns: [],
            verification: []
          },
          metadata: {
            author: 'agent-brain',
            version: '1.2.0',
            lastUpdated: new Date(),
            tags: ['auth', 'jwt', 'microservices'],
            source: 'eslint',
            confidence: 0.87
          },
          metrics: {
            usageCount: 89,
            effectiveness: 0.87,
            impact: 'high' as const
          },
          status: 'active'
        },
        {
          id: 'pattern-3',
          name: 'Test Naming Convention',
          category: 'review',
          description: 'Consistent naming patterns for test files and test cases',
          trigger: /it\(['"](should|test|spec)/i,
          message: 'Test names should follow given-when-then pattern',
          severity: 'info' as const,
          content: {
            problem: 'Inconsistent test naming making debugging difficult',
            solution: 'Use descriptive test names following given-when-then pattern',
            examples: [],
            antipatterns: [],
            verification: []
          },
          metadata: {
            author: 'agent-brain',
            version: '1.0.0',
            lastUpdated: new Date(),
            tags: ['testing', 'naming', 'convention'],
            source: 'typescript',
            confidence: 0.76
          },
          metrics: {
            usageCount: 42,
            effectiveness: 0.76,
            impact: 'medium' as const
          },
          status: 'draft'
        }
      ];

      res.json({ success: true, data: patterns });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error?.message : 'Failed to fetch patterns'
      });
    }
  }

  private async getPattern(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Mock implementation - integrate with real brain
      const pattern = {
        id,
        name: 'Sample Pattern',
        content: { /* pattern content */ }
      };
      res.json({ success: true, data: pattern });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch pattern' });
    }
  }

  private async updatePattern(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Mock implementation - integrate with real brain
      const updatedPattern = { id, ...updates };

      // Emit real-time update if WebSocket is available
      if (this.io) {
        this.io?.emit('pattern-updated', {
          type: 'pattern-updated',
          payload: updatedPattern,
          timestamp: new Date()
        });
      }

      res.json({ success: true, data: updatedPattern });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update pattern' });
    }
  }

  private async createVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { message, content } = req.body;

      // Mock version creation
      const version = {
        id: `version-${Date.now()}`,
        pattern_id: id,
        version: 2,
        content,
        author: 'agent-brain',
        message,
        created_at: new Date(),
        branch: 'main',
        status: 'active'
      };

      res.json({ success: true, data: version });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create version' });
    }
  }

  private async getVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versions: any[] = []; // Mock - integrate with versioning system
      res.json({ success: true, data: versions });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch versions' });
    }
  }

  private async getDiff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { from, to } = req.query;
      const diff = {}; // Mock - implement diff logic
      res.json({ success: true, data: diff });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get diff' });
    }
  }

  // Learning API methods
  private async getLearningSources(req: Request, res: Response) {
    try {
      const sources: LearningSource[] = [
        {
          id: 'jest',
          name: 'Jest Test Runner',
          type: 'test-framework',
          status: 'active',
          config: { watchMode: true },
          metrics: {
            patternsLearned: 45,
            successRate: 0.92,
            avgProcessingTime: 125,
            lastActivity: new Date()
          }
        },
        {
          id: 'eslint',
          name: 'ESLint Static Analysis',
          type: 'linter',
          status: 'active',
          config: { rules: ['@typescript-eslint/recommended'] },
          metrics: {
            patternsLearned: 38,
            successRate: 0.89,
            avgProcessingTime: 87,
            lastActivity: new Date()
          }
        }
      ];

      res.json({ success: true, data: sources });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch learning sources' });
    }
  }

  private async getLearningActivity(req: Request, res: Response) {
    try {
      const activity: any[] = []; // Mock - integrate with learning system
      res.json({ success: true, data: activity });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch learning activity' });
    }
  }

  private async manualLearn(req: Request, res: Response) {
    try {
      const learningData = req.body;
      // Mock - integrate with learning system
      res.json({ success: true, message: 'Learning submitted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to submit learning' });
    }
  }

  // Project Intelligence API methods
  private async getProjectStatus(req: Request, res: Response) {
    try {
      const status = {
        healthy: true,
        services: 8,
        implementation: {
          documented: 6,
          implemented: 5,
          tested: 4
        },
        coverage: {
          documentation: 0.75,
          implementation: 0.625,
          testing: 0.5
        }
      };

      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch project status' });
    }
  }

  private async getArchitecture(req: Request, res: Response) {
    try {
      const services: ServiceNode[] = [
        {
          id: 'auth-service',
          name: 'Authentication Service',
          type: 'service',
          status: 'implemented',
          health: 'healthy',
          dependencies: ['postgres', 'redis'],
          metrics: {
            uptime: 0.99,
            responseTime: 45,
            errorRate: 0.01
          },
          position: { x: 100, y: 100 }
        },
        {
          id: 'bff-service',
          name: 'Backend for Frontend',
          type: 'service',
          status: 'implemented',
          health: 'healthy',
          dependencies: ['auth-service', 'media-service'],
          metrics: {
            uptime: 0.98,
            responseTime: 67,
            errorRate: 0.02
          },
          position: { x: 300, y: 100 }
        }
      ];

      res.json({ success: true, data: services });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch architecture' });
    }
  }

  private async queryProject(req: Request, res: Response) {
    try {
      const { query } = req.body;

      const result = {
        query,
        results: [`Mock response for: ${query}`],
        suggestions: ['Check service logs', 'Review recent changes'],
        sources: ['agent-brain', 'learning-system'],
        confidence: 0.85
      };

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to query project' });
    }
  }

  // Analytics API methods
  private async getEffectiveness(req: Request, res: Response) {
    try {
      const metrics = {
        preventionRate: 94,
        falsePositiveRate: 3,
        learningVelocity: 42,
        crossServiceImpact: 8,
        totalPatterns: 500,
        activePatterns: 450,
        deprecatedPatterns: 50
      };

      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch effectiveness metrics' });
    }
  }

  private async getUsageStats(req: Request, res: Response) {
    try {
      const stats = {}; // Mock - implement usage tracking
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch usage stats' });
    }
  }

  private async getImpactMetrics(req: Request, res: Response) {
    try {
      const metrics = {}; // Mock - implement impact analysis
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch impact metrics' });
    }
  }

  // WebSocket setup
  setupWebSocket(wsPort: number = 3461) {
    if (!this.server) {
      throw new Error('HTTP server must be started before setting up WebSocket');
    }

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST']
      }
    });

    this.io?.on('connection', (socket) => {
      console.log('Client connected to WebSocket:', socket.id);

      // Handle pattern validation requests
      socket.on('validate-pattern', async (pattern) => {
        try {
          // Mock validation - integrate with real brain
          const result = {
            valid: true,
            errors: [],
            suggestions: []
          };

          socket.emit('validation-result', {
            type: 'validation-result',
            payload: result,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Pattern validation error:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    console.log(`🔌 WebSocket server running on port ${wsPort}`);
    return this.io;
  }

  // Server lifecycle
  async start(options: DashboardAPIOptions = {}) {
    const { port = 3460, wsPort = 3461 } = options;

    this.server = createServer(this.app);

    // Setup WebSocket
    this.setupWebSocket(wsPort);

    return new Promise<void>((resolve, reject) => {
      this.server?.listen(port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🚀 Dashboard API server running on port ${port}`);
          console.log(`📊 Health check: http://localhost:${port}/health`);
          resolve();
        }
      });
    });
  }

  async stop() {
    if (this.io) {
      this.io?.close();
    }
    if (this.server) {
      this.server?.close();
    }
    console.log('🛑 Dashboard API server stopped');
  }
}