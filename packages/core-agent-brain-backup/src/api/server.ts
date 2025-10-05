#!/usr/bin/env node

/**
 * Dashboard API Server
 *
 * This server provides the REST API and WebSocket endpoints for the Agent Brain Dashboard.
 * It integrates with the AgentBrain system to serve real-time pattern data, learning metrics,
 * and project intelligence.
 */

import { DashboardAPI } from './dashboard-api';
import { AgentBrainCore } from '../engine/agent-brain-core';
import { LearningSystem, createFileLearningSystem } from '../learning';
import { PatternSystem } from '../patterns';

interface ServerConfig {
  port: number;
  wsPort: number;
  brainPhase: 1 | 2;
  learningApiUrl: string;
}

class DashboardServer {
  private api?: DashboardAPI;
  private brain?: AgentBrainCore;
  private learningSystem?: LearningSystem;
  private patternSystem?: PatternSystem;

  async start(config: Partial<ServerConfig> = {}) {
    const {
      port = 3460,
      wsPort = 3461,
      brainPhase = 1,
      learningApiUrl = process?.env?.LEARNING_API || 'http://localhost:3457'
    } = config;

    console?.log('🧠 Starting Agent Brain Dashboard Server...');
    console?.log(`📊 API Port: ${port}`);
    console?.log(`🔌 WebSocket Port: ${wsPort}`);
    console?.log(`🎯 Brain Phase: ${brainPhase}`);

    try {
      // Initialize AgentBrainCore (optional - can run standalone)
      if (process?.env?.ENABLE_BRAIN_INTEGRATION !== 'false') {
        try {
          this.brain =new AgentBrainCore({
            enableLearning: true,
            debug: process?.env?.NODE_ENV === 'development'
          });
          console?.log('✅ AgentBrainCore integrated');
        } catch (error) {
          console?.warn('⚠️  AgentBrainCore integration failed, running in mock mode:', error);
        }
      }

      // Initialize Learning System (optional)
      if (process?.env?.ENABLE_LEARNING_INTEGRATION !== 'false') {
        try {
          this.learningSystem =createFileLearningSystem();
          console?.log('✅ Learning System integrated');
        } catch (error) {
          console?.warn('⚠️  Learning System integration failed, running in mock mode:', error);
        }
      }

      // Initialize Pattern System (optional)
      if (process?.env?.ENABLE_PATTERN_INTEGRATION !== 'false') {
        try {
          this.patternSystem =new PatternSystem({
            enableValidation: true,
            enableConflictChecking: true,
            autoLoadDefaults: true
          });
          console?.log('✅ Pattern System integrated');
        } catch (error) {
          console?.warn('⚠️  Pattern System integration failed, running in mock mode:', error);
        }
      }

      // Create and start Dashboard API
      this.api =new DashboardAPI(this?.learningSystem, this?.patternSystem);
      await this?.api?.start({ port, wsPort });

      console?.log('🎉 Dashboard Server started successfully!');
      console?.log(`📱 Dashboard: http://localhost:5173`);
      console?.log(`🔗 API: http://localhost:${port}`);
      console?.log(`🌐 WebSocket: ws://localhost:${wsPort}`);

      // Setup graceful shutdown
      this?.setupGracefulShutdown();

    } catch (error) {
      console?.error('❌ Failed to start Dashboard Server:', error);
      process?.exit(1);
    }
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console?.log(`\n📴 Received ${signal}, shutting down gracefully...`);

      if (this?.api) {
        await this?.api?.stop();
      }

      // Note: LearningSystem doesn't require explicit shutdown
      if (this?.learningSystem) {
        console?.log('Learning system shutdown handled by process exit');
      }

      console?.log('👋 Dashboard Server stopped');
      process?.exit(0);
    };

    process?.on('SIGTERM', () => shutdown('SIGTERM'));
    process?.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// CLI handling
if (require?.main === module) {
  const args = process?.argv?.slice(2);
  const config: Partial<ServerConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args?.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--port':
        config.port =parseInt(value, 10);
        break;
      case '--ws-port':
        config.wsPort =parseInt(value, 10);
        break;
      case '--brain-phase':
        config.brainPhase =parseInt(value, 10) as 1 | 2;
        break;
      case '--learning-api':
        config.learningApiUrl =value;
        break;
      case '--help':
        console?.log(`
Agent Brain Dashboard Server

Usage: node dist/api/server?.js [options]

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
  node dist/api/server?.js
  node dist/api/server?.js --port 3460 --ws-port 3461
  node dist/api/server?.js --brain-phase 2 --learning-api http://localhost:3457
        `);
        process?.exit(0);
        break;
    }
  }

  const server = new DashboardServer();
  server?.start(config);
}

export { DashboardServer };