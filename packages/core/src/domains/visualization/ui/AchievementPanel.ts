/**
 * AchievementPanel - Display panel for viewing all achievements
 *
 * Shows unlocked and locked achievements with progress tracking
 */

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  currentValue?: number;
  targetValue?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  totalPoints: number;
  completionPercentage: number;
}

export class AchievementPanel {
  private panelElement: HTMLElement | null = null;
  private achievements: AchievementData[] = [];
  private stats: AchievementStats | null = null;
  private isVisible: boolean = false;

  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Achievement panel container not found');
      return;
    }

    container.innerHTML = this.renderHidden();
  }

  /**
   * Show achievement panel with data
   */
  show(achievements: AchievementData[], stats: AchievementStats): void {
    this.achievements = achievements;
    this.stats = stats;

    this.panelElement = document.getElementById('achievement-panel');
    if (!this.panelElement) return;

    this.panelElement.innerHTML = this.renderPanel();
    this.panelElement.style.display = 'block';
    this.isVisible = true;

    this.attachEventListeners();
  }

  /**
   * Hide achievement panel
   */
  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Toggle panel visibility
   */
  toggle(achievements?: AchievementData[], stats?: AchievementStats): void {
    if (this.isVisible) {
      this.hide();
    } else {
      if (achievements && stats) {
        this.show(achievements, stats);
      }
    }
  }

  // Private methods

  private renderHidden(): string {
    return `<div id="achievement-panel" class="achievement-panel" style="display:none;"></div>`;
  }

  private renderPanel(): string {
    if (!this.stats) return '';

    return `
      <div class="achievement-panel-content">
        <div class="panel-header">
          <h2>🏆 Achievements</h2>
          <button class="close-btn" id="achievement-close-btn">×</button>
        </div>

        ${this.renderStats()}

        <div class="achievement-tabs">
          <button class="tab-btn active" data-category="all">All</button>
          <button class="tab-btn" data-category="getting-started">Getting Started</button>
          <button class="tab-btn" data-category="consistency">Consistency</button>
          <button class="tab-btn" data-category="quality">Quality</button>
          <button class="tab-btn" data-category="mastery">Mastery</button>
        </div>

        <div class="achievement-list" id="achievement-list">
          ${this.renderAchievementList('all')}
        </div>
      </div>
    `;
  }

  private renderStats(): string {
    if (!this.stats) return '';

    const { totalAchievements, unlockedAchievements, totalPoints, completionPercentage } = this.stats;

    return `
      <div class="achievement-stats">
        <div class="stat-card">
          <div class="stat-value">${unlockedAchievements}/${totalAchievements}</div>
          <div class="stat-label">Unlocked</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalPoints}</div>
          <div class="stat-label">Points</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Math.round(completionPercentage)}%</div>
          <div class="stat-label">Complete</div>
        </div>
      </div>
      <div class="achievement-progress-bar">
        <div class="progress-fill" style="width: ${completionPercentage}%"></div>
      </div>
    `;
  }

  private renderAchievementList(category: string): string {
    let filtered = this.achievements;

    if (category !== 'all') {
      filtered = this.achievements.filter(a => a.category === category);
    }

    // Sort: unlocked first, then by progress
    filtered.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.progress - a.progress;
    });

    if (filtered.length === 0) {
      return `<div class="empty-state">No achievements in this category yet.</div>`;
    }

    return filtered.map(a => this.renderAchievementCard(a)).join('');
  }

  private renderAchievementCard(achievement: AchievementData): string {
    const { id, name, description, icon, unlocked, unlockedAt, progress, currentValue, targetValue, rarity, points } = achievement;

    const rarityColor = this.getRarityColor(rarity);
    const statusClass = unlocked ? 'unlocked' : 'locked';
    const progressPercent = Math.round(progress * 100);

    return `
      <div class="achievement-card ${statusClass}" data-achievement-id="${id}" data-rarity="${rarity}">
        <div class="achievement-icon" style="border-color: ${rarityColor};">
          ${unlocked ? icon : '🔒'}
        </div>
        <div class="achievement-info">
          <div class="achievement-name" style="color: ${rarityColor};">
            ${name}
            ${unlocked ? '<span class="unlocked-badge">✓</span>' : ''}
          </div>
          <div class="achievement-description">${description}</div>

          ${!unlocked ? `
            <div class="achievement-progress">
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${progressPercent}%; background-color: ${rarityColor};"></div>
              </div>
              <div class="progress-text">${currentValue || 0} / ${targetValue || 0}</div>
            </div>
          ` : ''}

          <div class="achievement-footer">
            <span class="achievement-points">+${points} pts</span>
            <span class="achievement-rarity rarity-${rarity}">${this.capitalizeFirst(rarity)}</span>
            ${unlocked && unlockedAt ? `
              <span class="achievement-date">${this.formatDate(unlockedAt)}</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Close button
    document.getElementById('achievement-close-btn')?.addEventListener('click', () => {
      this.hide();
    });

    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const category = target.dataset.category || 'all';

        // Update active tab
        tabButtons.forEach(b => b.classList.remove('active'));
        target.classList.add('active');

        // Update list
        const list = document.getElementById('achievement-list');
        if (list) {
          list.innerHTML = this.renderAchievementList(category);
        }
      });
    });

    // Request achievement details on click (for future use)
    const cards = document.querySelectorAll('.achievement-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.achievementId;
        if (id && window.vscode) {
          window.vscode.postMessage({
            type: 'achievementClicked',
            achievementId: id
          });
        }
      });
    });
  }

  private getRarityColor(rarity: AchievementData['rarity']): string {
    switch (rarity) {
      case 'common': return '#9CA3AF';    // Gray
      case 'rare': return '#3B82F6';      // Blue
      case 'epic': return '#8B5CF6';      // Purple
      case 'legendary': return '#F59E0B'; // Gold
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString();
  }
}
