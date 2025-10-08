/**
 * ConfigurationView - Extension Settings & Preferences
 *
 * Provides UI for configuring Agent Brain extension settings
 */

export class ConfigurationView {
  private container: HTMLElement | null = null;
  private initialized: boolean = false;
  private settings: Record<string, any> = {};

  /**
   * Initialize the view
   */
  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[ConfigurationView] Container #${containerId} not found`);
      return;
    }

    this.container = container;
    this.loadSettings();
    this.render();
    this.attachEventListeners();
    this.initialized = true;

    console.log('[ConfigurationView] Initialized');
  }

  /**
   * Render the UI
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="config-header">
        <h1>⚙️ Agent Brain Configuration</h1>
        <p>Customize the extension behavior and preferences</p>
      </div>

      <!-- Timeline Settings -->
      <div class="tab-section">
        <h2 class="tab-section-title">📊 Timeline Settings</h2>

        <div class="config-row">
          <label class="config-label">
            <span>Show Legend</span>
            <input type="checkbox" id="setting-show-legend" ${this.settings.showLegend !== false ? 'checked' : ''}>
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Enable Animations</span>
            <input type="checkbox" id="setting-animations" ${this.settings.animations !== false ? 'checked' : ''}>
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Theme</span>
            <select id="setting-theme" class="config-select">
              <option value="cosmic" ${this.settings.theme === 'cosmic' ? 'selected' : ''}>Cosmic (Default)</option>
              <option value="minimal" ${this.settings.theme === 'minimal' ? 'selected' : ''}>Minimal</option>
              <option value="vibrant" ${this.settings.theme === 'vibrant' ? 'selected' : ''}>Vibrant</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Knowledge Settings -->
      <div class="tab-section">
        <h2 class="tab-section-title">📚 Knowledge Enhancement</h2>

        <div class="config-row">
          <label class="config-label">
            <span>Max Knowledge Items Per Prompt</span>
            <input type="number" id="setting-max-items" class="config-input" min="1" max="50" value="${this.settings.maxKnowledgeItems || 10}">
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Include Patterns</span>
            <input type="checkbox" id="setting-include-patterns" ${this.settings.includePatterns !== false ? 'checked' : ''}>
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Include Learnings</span>
            <input type="checkbox" id="setting-include-learnings" ${this.settings.includeLearnings !== false ? 'checked' : ''}>
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Include ADRs</span>
            <input type="checkbox" id="setting-include-adrs" ${this.settings.includeADRs !== false ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <!-- Session Settings -->
      <div class="tab-section">
        <h2 class="tab-section-title">⏱️ Session Management</h2>

        <div class="config-row">
          <label class="config-label">
            <span>Session Timeout (minutes)</span>
            <input type="number" id="setting-session-timeout" class="config-input" min="5" max="480" value="${this.settings.sessionTimeout || 60}">
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Track File Changes</span>
            <input type="checkbox" id="setting-track-files" ${this.settings.trackFileChanges !== false ? 'checked' : ''}>
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Auto-Save Sessions</span>
            <input type="checkbox" id="setting-auto-save" ${this.settings.autoSaveSessions !== false ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <!-- UI Preferences -->
      <div class="tab-section">
        <h2 class="tab-section-title">🎨 UI Preferences</h2>

        <div class="config-row">
          <label class="config-label">
            <span>Default Tab on Open</span>
            <select id="setting-default-tab" class="config-select">
              <option value="timeline" ${this.settings.defaultTab === 'timeline' ? 'selected' : ''}>Timeline</option>
              <option value="prompt" ${this.settings.defaultTab === 'prompt' ? 'selected' : ''}>Prompt Support</option>
              <option value="knowledge" ${this.settings.defaultTab === 'knowledge' ? 'selected' : ''}>Knowledge</option>
            </select>
          </label>
        </div>

        <div class="config-row">
          <label class="config-label">
            <span>Show Tooltips</span>
            <input type="checkbox" id="setting-show-tooltips" ${this.settings.showTooltips !== false ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="config-actions">
        <button id="save-config-btn" class="btn btn-primary">💾 Save Settings</button>
        <button id="reset-config-btn" class="btn btn-secondary">🔄 Reset to Defaults</button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const saveBtn = document.getElementById('save-config-btn');
    const resetBtn = document.getElementById('reset-config-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }

    // Auto-save on checkbox changes
    const checkboxes = this.container?.querySelectorAll('input[type="checkbox"]');
    checkboxes?.forEach(cb => {
      cb.addEventListener('change', () => this.collectAndSaveSettings());
    });
  }

  /**
   * Collect current settings from UI
   */
  private collectSettings(): Record<string, any> {
    const getChecked = (id: string) => (document.getElementById(id) as HTMLInputElement)?.checked;
    const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
    const getNumberValue = (id: string) => parseInt((document.getElementById(id) as HTMLInputElement)?.value || '0');

    return {
      showLegend: getChecked('setting-show-legend'),
      animations: getChecked('setting-animations'),
      theme: getValue('setting-theme'),
      maxKnowledgeItems: getNumberValue('setting-max-items'),
      includePatterns: getChecked('setting-include-patterns'),
      includeLearnings: getChecked('setting-include-learnings'),
      includeADRs: getChecked('setting-include-adrs'),
      sessionTimeout: getNumberValue('setting-session-timeout'),
      trackFileChanges: getChecked('setting-track-files'),
      autoSaveSessions: getChecked('setting-auto-save'),
      defaultTab: getValue('setting-default-tab'),
      showTooltips: getChecked('setting-show-tooltips')
    };
  }

  /**
   * Save settings
   */
  private collectAndSaveSettings(): void {
    this.settings = this.collectSettings();
    this.persistSettings();
  }

  /**
   * Save settings (with user feedback)
   */
  private saveSettings(): void {
    this.settings = this.collectSettings();
    this.persistSettings();

    // Send to extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'updateConfig',
        settings: this.settings
      });
    }

    // Visual feedback
    const saveBtn = document.getElementById('save-config-btn');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✅ Saved!';
      saveBtn.classList.add('success');
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.classList.remove('success');
      }, 2000);
    }
  }

  /**
   * Reset to default settings
   */
  private resetSettings(): void {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    this.settings = this.getDefaultSettings();
    this.persistSettings();
    this.render();
    this.attachEventListeners();

    // Send to extension
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'updateConfig',
        settings: this.settings
      });
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): Record<string, any> {
    return {
      showLegend: true,
      animations: true,
      theme: 'cosmic',
      maxKnowledgeItems: 10,
      includePatterns: true,
      includeLearnings: true,
      includeADRs: true,
      sessionTimeout: 60,
      trackFileChanges: true,
      autoSaveSessions: true,
      defaultTab: 'timeline',
      showTooltips: true
    };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('agentbrain.settings');
      if (saved) {
        this.settings = JSON.parse(saved);
      } else {
        this.settings = this.getDefaultSettings();
      }
    } catch (error) {
      console.warn('[ConfigurationView] Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * Persist settings to localStorage
   */
  private persistSettings(): void {
    try {
      localStorage.setItem('agentbrain.settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('[ConfigurationView] Failed to save settings:', error);
    }
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.container = null;
    this.initialized = false;
  }
}
