/**
 * MessageRouter
 *
 * Generic message routing service with handler registration pattern.
 * Responsible for:
 * - Routing messages to registered handlers
 * - Managing handler chain (try handlers in order)
 * - Logging unhandled messages
 * - Error handling and recovery
 */

import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

/**
 * Message handler interface
 * Handlers return true if they handled the message, false otherwise
 */
export interface MessageHandler {
  handleMessage(message: any): Promise<boolean>;
}

export class MessageRouter {
  private handlers: MessageHandler[] = [];

  /**
   * Register a message handler
   * Handlers are tried in registration order
   */
  registerHandler(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Route message to appropriate handler
   * Returns true if any handler processed the message
   */
  async routeMessage(message: any): Promise<boolean> {
    logger.debug(
      LogCategory.WEBVIEW,
      `Routing message: ${message.type}`,
      'MessageRouter.routeMessage',
      { type: message.type, hasData: !!message.data },
      LogPathway.WEBVIEW_MESSAGING
    );

    try {
      // Try each handler in order
      for (const handler of this.handlers) {
        const handled = await handler.handleMessage(message);
        if (handled) {
          logger.debug(
            LogCategory.WEBVIEW,
            `Message ${message.type} handled by ${handler.constructor.name}`,
            'MessageRouter.routeMessage',
            undefined,
            LogPathway.WEBVIEW_MESSAGING
          );
          return true;
        }
      }

      // No handler processed the message
      logger.warn(
        LogCategory.WEBVIEW,
        `No handler found for message type: ${message.type}`,
        'MessageRouter.routeMessage',
        { type: message.type, availableHandlers: this.handlers.length },
        LogPathway.WEBVIEW_MESSAGING
      );

      return false;
    } catch (error) {
      logger.error(
        LogCategory.WEBVIEW,
        `Error routing message: ${message.type}`,
        'MessageRouter.routeMessage',
        { type: message.type, error },
        LogPathway.WEBVIEW_MESSAGING
      );

      throw error; // Re-throw for caller to handle
    }
  }

  /**
   * Get number of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearHandlers(): void {
    this.handlers = [];
  }
}
