/**
 * SuccessCelebrationToast - Toast notifications for achievements and successes
 *
 * Provides positive reinforcement with celebratory animations
 */

export type CelebrationType = 'achievement' | 'success' | 'milestone' | 'skill-up';
export type AnimationType = 'confetti' | 'pulse' | 'glow' | 'bounce';

export interface CelebrationEvent {
  type: CelebrationType;
  title: string;
  message: string;
  icon: string;
  duration: number;  // ms
  animation: AnimationType;
  points?: number;   // Achievement points
}

export class SuccessCelebrationToast {
  private container: HTMLElement | null = null;
  private activeToasts: Set<HTMLElement> = new Set();
  private maxToasts: number = 3;

  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Success celebration container not found');
      return;
    }

    container.innerHTML = this.renderContainer();
    this.container = document.getElementById('celebration-toast-container');
  }

  /**
   * Show a celebration toast
   */
  show(event: CelebrationEvent): void {
    if (!this.container) {
      console.error('Celebration toast not initialized');
      return;
    }

    // Remove oldest toast if at max
    if (this.activeToasts.size >= this.maxToasts) {
      const oldest = Array.from(this.activeToasts)[0];
      this.removeToast(oldest);
    }

    // Create toast element
    const toast = this.createToast(event);
    this.container.appendChild(toast);
    this.activeToasts.add(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss after duration
    setTimeout(() => {
      this.dismissToast(toast);
    }, event.duration);

    // Play animation based on type
    this.playAnimation(event.animation, toast);
  }

  /**
   * Show achievement unlock celebration
   */
  showAchievement(achievement: { name: string; description: string; icon: string; points: number }): void {
    this.show({
      type: 'achievement',
      title: '🎉 Achievement Unlocked!',
      message: `${achievement.icon} ${achievement.name}`,
      icon: achievement.icon,
      duration: 5000,
      animation: 'confetti',
      points: achievement.points
    });
  }

  /**
   * Show session success celebration
   */
  showSuccess(message: string): void {
    this.show({
      type: 'success',
      title: '✅ Success!',
      message,
      icon: '✅',
      duration: 3000,
      animation: 'pulse'
    });
  }

  /**
   * Show milestone celebration
   */
  showMilestone(milestone: string): void {
    this.show({
      type: 'milestone',
      title: '🎯 Milestone Reached!',
      message: milestone,
      icon: '🎯',
      duration: 4000,
      animation: 'glow'
    });
  }

  /**
   * Show skill level up celebration
   */
  showSkillUp(newLevel: string): void {
    this.show({
      type: 'skill-up',
      title: '📈 Level Up!',
      message: `You've reached ${newLevel} skill level!`,
      icon: '📈',
      duration: 5000,
      animation: 'bounce'
    });
  }

  // Private methods

  private renderContainer(): string {
    return `
      <div id="celebration-toast-container" class="celebration-toast-container"></div>
    `;
  }

  private createToast(event: CelebrationEvent): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `celebration-toast celebration-${event.type}`;
    toast.setAttribute('data-animation', event.animation);

    const iconClass = this.getIconClass(event.type);

    toast.innerHTML = `
      <div class="toast-icon ${iconClass}">
        ${event.icon}
      </div>
      <div class="toast-content">
        <div class="toast-title">${event.title}</div>
        <div class="toast-message">${event.message}</div>
        ${event.points ? `<div class="toast-points">+${event.points} points</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

    // Attach close button event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => {
      this.dismissToast(toast);
    });

    return toast;
  }

  private getIconClass(type: CelebrationType): string {
    switch (type) {
      case 'achievement': return 'icon-achievement';
      case 'success': return 'icon-success';
      case 'milestone': return 'icon-milestone';
      case 'skill-up': return 'icon-skillup';
    }
  }

  private dismissToast(toast: HTMLElement): void {
    toast.classList.remove('show');
    toast.classList.add('hide');

    setTimeout(() => {
      this.removeToast(toast);
    }, 300);  // Match CSS transition duration
  }

  private removeToast(toast: HTMLElement): void {
    if (this.container && toast.parentNode === this.container) {
      this.container.removeChild(toast);
    }
    this.activeToasts.delete(toast);
  }

  private playAnimation(animation: AnimationType, toast: HTMLElement): void {
    switch (animation) {
      case 'confetti':
        this.playConfettiAnimation(toast);
        break;
      case 'pulse':
        this.playPulseAnimation(toast);
        break;
      case 'glow':
        this.playGlowAnimation(toast);
        break;
      case 'bounce':
        this.playBounceAnimation(toast);
        break;
    }
  }

  private playConfettiAnimation(toast: HTMLElement): void {
    // Create confetti particles
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

    for (let i = 0; i < 20; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = `${Math.random() * 0.5}s`;
      confetti.style.animationDuration = `${1 + Math.random()}s`;

      confettiContainer.appendChild(confetti);
    }

    toast.appendChild(confettiContainer);

    // Remove confetti after animation
    setTimeout(() => {
      if (toast.contains(confettiContainer)) {
        toast.removeChild(confettiContainer);
      }
    }, 2000);
  }

  private playPulseAnimation(toast: HTMLElement): void {
    const icon = toast.querySelector('.toast-icon');
    if (icon) {
      icon.classList.add('pulse-animation');
      setTimeout(() => icon.classList.remove('pulse-animation'), 1000);
    }
  }

  private playGlowAnimation(toast: HTMLElement): void {
    toast.classList.add('glow-animation');
    setTimeout(() => toast.classList.remove('glow-animation'), 2000);
  }

  private playBounceAnimation(toast: HTMLElement): void {
    const icon = toast.querySelector('.toast-icon');
    if (icon) {
      icon.classList.add('bounce-animation');
      setTimeout(() => icon.classList.remove('bounce-animation'), 1000);
    }
  }
}
