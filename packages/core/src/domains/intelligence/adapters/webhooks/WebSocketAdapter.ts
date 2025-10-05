/**
 * Agent Brain WebSocket Service
 * Real-time communication for dashboard updates and learning events
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { LearningPattern, TestFailure, LearningMetrics } from '../../core/learning/types';

export interface WebSocketEvents {
  // Learning events
  'pattern-discovered': (pattern: LearningPattern) => void;
  'pattern-applied': (patternId: string, file: string) => void;
  'failure-processed': (failure: TestFailure) => void;
  'metrics-updated': (metrics: LearningMetrics) => void;

  // Extension events
  'extension-loaded': (extensionName: string) => void;
  'extension-error': (extensionName: string, error: string) => void;

  // Analysis events
  'analysis-started': (context: { files: string[]; type: string }) => void;
  'analysis-completed': (result: { patterns: number; suggestions: number }) => void;

  // Dashboard events
  'dashboard-connected': () => void;
  'dashboard-disconnected': () => void;
}

export interface ClientWebSocketEvents {
  // Client can request data
  'get-patterns': (callback: (patterns: LearningPattern[]) => void) => void;
  'get-metrics': (callback: (metrics: LearningMetrics) => void) => void;
  'trigger-analysis': (files: string[]) => void;
  'apply-suggestion': (patternId: string, file: string) => void;
}

export class AgentBrainWebSocket {
  private io?: SocketIOServer;
  private connectedClients = new Set<string>();

  constructor(server?: HTTPServer) {
    if (server) {
      this?.initialize(server);
    }
  }

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this?.setupEventHandlers();
    console?.log('🔌 Agent Brain WebSocket initialized');
  }

  private setupEventHandlers(): void {
    if (!this?.io) return;

    this?.io?.on('connection', (socket) => {
      const clientId = socket?.id;
      this?.connectedClients?.add(clientId);

      console?.log(`📡 Dashboard connected: ${clientId}`);

      // Send welcome message
      socket?.emit('dashboard-connected');

      // Handle client requests
      socket?.on('get-patterns', (callback) => {
        // This would be connected to the actual learning system
        callback([]);
      });

      socket?.on('get-metrics', (callback) => {
        // This would be connected to the actual learning system
        callback({
          totalPatterns: 0,
          totalOccurrences: 0,
          avgConfidenceScore: 0,
          topCategories: [],
          recentPatterns: []
        });
      });

      socket?.on('trigger-analysis', (files: string[]) => {
        this?.broadcastAnalysisStarted({ files, type: 'manual' });
        // Trigger actual analysis here
      });

      socket?.on('apply-suggestion', (patternId: string, file: string) => {
        this?.broadcastPatternApplied(patternId, file);
        // Apply actual suggestion here
      });

      socket?.on('disconnect', () => {
        this?.connectedClients?.delete(clientId);
        console?.log(`📡 Dashboard disconnected: ${clientId}`);
        socket?.emit('dashboard-disconnected');
      });

      socket?.on('error', (error) => {
        console?.error(`WebSocket error for ${clientId}:`, error);
      });
    });
  }

  // Learning System Events
  broadcastPatternDiscovered(pattern: LearningPattern): void {
    this?.io?.emit('pattern-discovered', pattern);
    console?.log(`📡 Broadcasting pattern discovered: ${pattern?.name}`);
  }

  broadcastPatternApplied(patternId: string, file: string): void {
    this?.io?.emit('pattern-applied', patternId, file);
    console?.log(`📡 Broadcasting pattern applied: ${patternId} to ${file}`);
  }

  broadcastFailureProcessed(failure: TestFailure): void {
    this?.io?.emit('failure-processed', failure);
    console?.log(`📡 Broadcasting failure processed: ${failure?.test}`);
  }

  broadcastMetricsUpdated(metrics: LearningMetrics): void {
    this?.io?.emit('metrics-updated', metrics);
    console?.log(`📡 Broadcasting metrics updated: ${metrics?.totalPatterns} patterns`);
  }

  // Extension Events
  broadcastExtensionLoaded(extensionName: string): void {
    this?.io?.emit('extension-loaded', extensionName);
    console?.log(`📡 Broadcasting extension loaded: ${extensionName}`);
  }

  broadcastExtensionError(extensionName: string, error: string): void {
    this?.io?.emit('extension-error', extensionName, error);
    console?.log(`📡 Broadcasting extension error: ${extensionName} - ${error}`);
  }

  // Analysis Events
  broadcastAnalysisStarted(context: { files: string[]; type: string }): void {
    this?.io?.emit('analysis-started', context);
    console?.log(`📡 Broadcasting analysis started: ${context?.files?.length} files`);
  }

  broadcastAnalysisCompleted(result: { patterns: number; suggestions: number }): void {
    this?.io?.emit('analysis-completed', result);
    console?.log(`📡 Broadcasting analysis completed: ${result?.patterns} patterns, ${result?.suggestions} suggestions`);
  }

  // Connection Management
  getConnectedClients(): string[] {
    return Array?.from(this?.connectedClients);
  }

  getConnectionCount(): number {
    return this?.connectedClients?.size;
  }

  isConnected(): boolean {
    return this?.connectedClients?.size > 0;
  }

  // Broadcast to specific clients
  broadcastToClient(clientId: string, event: string, data: any): void {
    this?.io?.to(clientId).emit(event, data);
  }

  // Send system status updates
  broadcastSystemStatus(status: {
    learning: boolean;
    extensions: number;
    patterns: number;
    uptime: number;
  }): void {
    this?.io?.emit('system-status', status);
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean;
    clients: number;
    uptime: number;
  }> {
    return {
      connected: !!this?.io,
      clients: this?.connectedClients?.size,
      uptime: process?.uptime()
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this?.io) {
      // Notify all clients of shutdown
      this?.io?.emit('system-shutdown', {
        message: 'Agent Brain is shutting down',
        timestamp: new Date()
      });

      // Give clients time to handle the message
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Close all connections
      this?.io?.close();
      this?.connectedClients?.clear();

      console?.log('🔌 Agent Brain WebSocket shutdown complete');
    }
  }
}

export default AgentBrainWebSocket;