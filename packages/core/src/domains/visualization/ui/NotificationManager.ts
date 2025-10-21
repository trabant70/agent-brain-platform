/**
 * NotificationManager - Toast Notification System (Phase 1 MVP)
 *
 * Displays toast notifications for user feedback.
 * Renders globally (not tied to specific container).
 *
 * Phase 1 MVP Features:
 * - 4 notification types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Optional action button
 * - Multiple notifications stacked
 * - Click to dismiss
 *
 * NO animations in Phase 1 (simple show/hide)
 */

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // ms, default 4000. Set to 0 for no auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationInstance extends NotificationConfig {
  id: string;
  element: HTMLElement;
  timeout?: number;
}

export class NotificationManager {
  private container: HTMLElement | null = null;
  private notifications: Map<string, NotificationInstance> = new Map();
  private nextId: number = 1;

  constructor() {
    this.initializeContainer();
  }

  /**
   * Initialize the global notification container
   */
  private initializeContainer(): void {
    // Create container if not exists
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    this.container = container;
  }

  /**
   * Show a notification
   */
  show(config: NotificationConfig): string {
    if (!this.container) {
      console.error('NotificationManager: Container not initialized');
      return '';
    }

    // Generate unique ID
    const id = `notification-${this.nextId++}`;

    // Create notification element
    const element = this.createNotificationElement(id, config);

    // Store instance
    const instance: NotificationInstance = {
      ...config,
      id,
      element
    };

    this.notifications.set(id, instance);

    // Add to container
    this.container.appendChild(element);

    // Auto-dismiss if duration > 0
    const duration = config.duration !== undefined ? config.duration : 4000;
    if (duration > 0) {
      instance.timeout = window.setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  /**
   * Dismiss a notification
   */
  dismiss(id: string): void {
    const instance = this.notifications.get(id);
    if (!instance) return;

    // Clear timeout
    if (instance.timeout) {
      clearTimeout(instance.timeout);
    }

    // Remove element
    if (instance.element.parentNode) {
      instance.element.parentNode.removeChild(instance.element);
    }

    // Remove from map
    this.notifications.delete(id);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.dismiss(id));
  }

  /**
   * Create notification element
   */
  private createNotificationElement(id: string, config: NotificationConfig): HTMLElement {
    const { type, message, action } = config;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('data-notification-id', id);

    // Icon
    const icon = this.getIcon(type);

    // Action button
    const actionButton = action
      ? `<button class="notification-action">${action.label}</button>`
      : '';

    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${this.escapeHtml(message)}</span>
      </div>
      ${actionButton}
      <button class="notification-close">&times;</button>
    `;

    // Attach event listeners
    this.attachEventListeners(notification, id, action);

    return notification;
  }

  /**
   * Get icon for notification type
   */
  private getIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners to notification
   */
  private attachEventListeners(
    element: HTMLElement,
    id: string,
    action?: NotificationConfig['action']
  ): void {
    // Close button
    const closeBtn = element.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss(id);
      });
    }

    // Action button
    if (action) {
      const actionBtn = element.querySelector('.notification-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          action.onClick();
          this.dismiss(id);
        });
      }
    }

    // Click to dismiss
    element.addEventListener('click', () => {
      this.dismiss(id);
    });
  }

  /**
   * Dispose
   */
  dispose(): void {
    // Dismiss all notifications
    this.dismissAll();

    // Remove container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    console.log('NotificationManager: Disposed');
  }
}
