/**
 * MaturityConfigPanel - UI for configuring maturity context
 *
 * Renders complexity dropdown + 5x5 quadrant grid with Controls button pattern
 * Follows timeline component UI pattern for consistency
 */

import { DomainComplexity } from '../../../knowledge/types';
import { FramingTemplates } from '../../../knowledge/FramingTemplates';
import { t } from '../../webview/i18n';
import { ModalDialog } from '../ModalDialog';

export interface MaturityContext {
  complexity: DomainComplexity;
  quadrant: number;
  maxItems?: number;
}

export interface MaturityConfigCallbacks {
  onSaveContext: (context: MaturityContext) => void;
  onContextChanged: (context: MaturityContext) => void;
}

/**
 * MaturityConfigPanel - Configuration UI for maturity context
 */
export class MaturityConfigPanel {
  private container: HTMLElement | null = null;
  private currentContext: MaturityContext;

  constructor(private callbacks: MaturityConfigCallbacks) {
    this.currentContext = {
      complexity: DomainComplexity.STANDARD,
      quadrant: 13,  // Center of grid (Mid/Development)
      maxItems: 25
    };
    // Note: i18n re-rendering is handled by KnowledgeViewController.onI18nReady()
  }

  /**
   * Set current context (called when loading from backend)
   */
  setContext(context: MaturityContext): void {
    this.currentContext = context;
    if (this.container) {
      this.render();
    }
  }

  /**
   * Render the maturity configuration section
   * Returns header with Controls button that opens proper modal dialog
   */
  render(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'maturity-section';
    section.innerHTML = `
      <div class="maturity-header">
        <div class="header-left">
          <h3>${t('maturity.contextConfiguration')}</h3>
          <span class="context-summary">${this.getContextSummary()}</span>
        </div>
        <button class="btn-controls" id="maturity-controls-toggle" title="${t('maturity.contextConfiguration')}">
          <span class="codicon codicon-settings-gear"></span> ${t('button.controls')}
        </button>
      </div>
    `;

    this.container = section;
    this.attachEventListeners();
    return section;
  }

  /**
   * Get human-readable context summary
   */
  private getContextSummary(): string {
    try {
      const quadrantInfo = FramingTemplates.getQuadrantInfo(this.currentContext.quadrant);
      const complexityLabel = this.currentContext.complexity.charAt(0).toUpperCase() +
                              this.currentContext.complexity.slice(1);
      return `${quadrantInfo.label} (${complexityLabel} complexity)`;
    } catch (error) {
      return 'Not configured';
    }
  }

  /**
   * Render configuration panel content
   *
   * NOTE: The maturity context is a SINGLE unified configuration with 3 dimensions:
   * - Complexity (Simple/Standard/Complex) - dropdown selection
   * - Quadrant (1-25) - grid selection for Operator × Project maturity
   * - Max items - slider
   *
   * You don't set separate quadrants per complexity level. Instead, you:
   * 1. Select your complexity level (Simple/Standard/Complex)
   * 2. Select ONE quadrant on the grid (your Operator × Project maturity)
   * 3. Adjust max items if needed
   * 4. Click "Apply Configuration" to save
   *
   * The complexity level affects which items are relevant, combined with the quadrant.
   */
  private renderConfigPanel(): string {
    return `
      <div class="maturity-config-body">
        <!-- Complexity Dropdown -->
        <div class="complexity-selector">
          <label for="complexity-select">${t('maturity.complexityLevel')}</label>
          <select id="complexity-select" class="complexity-dropdown">
            <option value="simple" ${this.currentContext.complexity === DomainComplexity.SIMPLE ? 'selected' : ''}>
              ${t('maturity.complexity.simple')} (${t('maturity.complexity.simple.desc')})
            </option>
            <option value="standard" ${this.currentContext.complexity === DomainComplexity.STANDARD ? 'selected' : ''}>
              ${t('maturity.complexity.standard')} (${t('maturity.complexity.standard.desc')})
            </option>
            <option value="complex" ${this.currentContext.complexity === DomainComplexity.COMPLEX ? 'selected' : ''}>
              ${t('maturity.complexity.complex')} (${t('maturity.complexity.complex.desc')})
            </option>
          </select>
        </div>

        <!-- 5x5 Quadrant Grid -->
        <div class="quadrant-grid-container">
          <p class="grid-label">${t('maturity.yourContext')} <strong>${this.getQuadrantLabel()}</strong></p>

          <div class="quadrant-grid-5x5">
            <!-- Y-axis label -->
            <div class="grid-axis-y">${t('maturity.projectPhase')}</div>

            <!-- Row labels + buttons -->
            ${this.renderGridRow(5, t('maturity.project.mature'), [21, 22, 23, 24, 25])}
            ${this.renderGridRow(4, t('maturity.project.established'), [16, 17, 18, 19, 20])}
            ${this.renderGridRow(3, t('maturity.project.development'), [11, 12, 13, 14, 15])}
            ${this.renderGridRow(2, t('maturity.project.inception'), [6, 7, 8, 9, 10])}
            ${this.renderGridRow(1, t('maturity.project.planning'), [1, 2, 3, 4, 5])}

            <!-- Column labels -->
            <div class="grid-col-labels">
              <div class="grid-col-label">${t('maturity.operator.novice')}</div>
              <div class="grid-col-label">${t('maturity.operator.junior')}</div>
              <div class="grid-col-label">${t('maturity.operator.mid')}</div>
              <div class="grid-col-label">${t('maturity.operator.senior')}</div>
              <div class="grid-col-label">${t('maturity.operator.expert')}</div>
            </div>

            <!-- X-axis label -->
            <div class="grid-axis-x">${t('maturity.operatorExperience')}</div>
          </div>
        </div>

        <!-- Max Items Slider -->
        <div class="max-items-control">
          <label for="max-items-slider">
            ${t('maturity.maximumItems')} <span id="max-items-value">${this.currentContext.maxItems || 25}</span>
          </label>
          <input
            type="range"
            id="max-items-slider"
            min="5"
            max="50"
            step="5"
            value="${this.currentContext.maxItems || 25}"
          />
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="btn-secondary" id="reset-defaults">${t('maturity.resetToDefaults')}</button>
          <button class="btn-primary" id="apply-config">${t('maturity.applyConfiguration')}</button>
        </div>
      </div>
    `;
  }

  /**
   * Render a single grid row with label and quadrant buttons
   */
  private renderGridRow(rowIndex: number, label: string, quadrants: number[]): string {
    // Explicitly place row label and buttons in grid
    // rowIndex: 1=Planning, 2=Inception, 3=Development, 4=Established, 5=Mature
    const gridRow = 6 - rowIndex;  // Invert: row 1 in UI = grid row 5, row 5 in UI = grid row 1

    return `
      <div class="grid-row-label" style="grid-row: ${gridRow}; grid-column: 1;">${label}</div>
      ${quadrants.map((q, idx) => {
        const gridCol = idx + 2;  // Columns 2-6 for the 5 buttons
        return this.renderQuadrantButton(q, gridRow, gridCol);
      }).join('')}
    `;
  }

  /**
   * Render individual quadrant button
   */
  private renderQuadrantButton(quadrant: number, gridRow?: number, gridCol?: number): string {
    const isSelected = this.currentContext.quadrant === quadrant;
    const quadrantInfo = FramingTemplates.getQuadrantInfo(quadrant);

    const gridStyle = (gridRow !== undefined && gridCol !== undefined)
      ? ` style="grid-row: ${gridRow}; grid-column: ${gridCol};"`
      : '';

    return `
      <button
        class="quadrant-btn ${isSelected ? 'selected' : ''}"
        data-quadrant="${quadrant}"
        title="${quadrantInfo.label}"${gridStyle}
      >
        Q${quadrant}
      </button>
    `;
  }

  /**
   * Get quadrant label for current selection
   */
  private getQuadrantLabel(): string {
    try {
      const quadrantInfo = FramingTemplates.getQuadrantInfo(this.currentContext.quadrant);
      return quadrantInfo.label;
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Attach event listeners to interactive elements
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Controls toggle button - opens modal dialog
    const controlsToggle = this.container.querySelector('#maturity-controls-toggle') as HTMLButtonElement;

    controlsToggle?.addEventListener('click', () => {
      this.showModal();
    });
  }


  /**
   * Update context summary in header
   */
  private updateContextSummary(): void {
    if (!this.container) return;

    const summary = this.container.querySelector('.context-summary');
    if (summary) {
      summary.textContent = this.getContextSummary();
    }
  }

  /**
   * Notify that context has changed (for live preview)
   */
  private notifyContextChanged(): void {
    this.callbacks.onContextChanged(this.currentContext);
  }

  /**
   * Reset configuration to defaults
   */
  private resetToDefaults(): void {
    this.currentContext = {
      complexity: DomainComplexity.STANDARD,
      quadrant: 13,
      maxItems: 25
    };
    this.notifyContextChanged();
    this.updateContextSummary();
  }

  /**
   * Show configuration modal dialog
   */
  private async showModal(): Promise<void> {
    const modal = new ModalDialog();

    try {
      // Start showing the modal (don't await yet)
      const modalPromise = modal.show({
        title: t('maturity.contextConfiguration'),
        content: this.renderConfigPanel(),
        buttons: [
          {
            label: t('button.resetToDefaults', 'Reset to Defaults'),
            onClick: () => {
              this.resetToDefaults();
              // Re-render modal content with updated values
              const modalBody = document.querySelector('.modal-body');
              if (modalBody) {
                modalBody.innerHTML = this.renderConfigPanel();
                this.attachModalEventListeners();
              }
            }
          },
          {
            label: t('button.cancel', 'Cancel'),
            onClick: () => modal.close()
          },
          {
            label: t('button.save', 'Save'),
            primary: true,
            onClick: () => {
              this.applyConfiguration();
              modal.close();
            }
          }
        ],
        width: '750px'
      });

      // Attach event listeners to modal content after DOM is ready
      setTimeout(() => {
        this.attachModalEventListeners();
      }, 0);

      // Now wait for modal to close
      await modalPromise;
    } catch (error) {
      console.error('[MaturityConfigPanel] Modal error:', error);
    }
  }

  /**
   * Attach event listeners to modal content
   */
  private attachModalEventListeners(): void {
    // Complexity selector
    const complexitySelect = document.querySelector('#complexity-select') as HTMLSelectElement;
    complexitySelect?.addEventListener('change', (e) => {
      this.currentContext.complexity = (e.target as HTMLSelectElement).value as DomainComplexity;
      this.notifyContextChanged();
      this.updateContextSummary();
    });

    // Quadrant buttons
    const quadrantButtons = document.querySelectorAll('.quadrant-btn');
    console.log('[MaturityConfigPanel] Attached event listeners to', quadrantButtons.length, 'quadrant buttons');

    quadrantButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const quadrant = parseInt(target.dataset.quadrant || '13');
        console.log('[MaturityConfigPanel] Quadrant clicked:', quadrant, 'Previous:', this.currentContext.quadrant);

        this.currentContext.quadrant = quadrant;
        this.notifyContextChanged();

        // Re-render to update selection
        this.rerenderQuadrantGridInModal();
        this.updateContextSummary();

        console.log('[MaturityConfigPanel] Updated to quadrant:', this.currentContext.quadrant);
      });
    });

    // Max items slider
    const maxItemsSlider = document.querySelector('#max-items-slider') as HTMLInputElement;
    const maxItemsValue = document.querySelector('#max-items-value') as HTMLElement;

    maxItemsSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.currentContext.maxItems = value;
      if (maxItemsValue) maxItemsValue.textContent = value.toString();
      this.notifyContextChanged();
    });
  }

  /**
   * Re-render just the quadrant grid in modal (for selection updates)
   */
  private rerenderQuadrantGridInModal(): void {
    const quadrantButtons = document.querySelectorAll('.quadrant-btn');
    quadrantButtons.forEach(btn => {
      const quadrant = parseInt((btn as HTMLElement).dataset.quadrant || '0');
      if (quadrant === this.currentContext.quadrant) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    // Update grid label
    const gridLabel = document.querySelector('.grid-label strong');
    if (gridLabel) {
      gridLabel.textContent = this.getQuadrantLabel();
    }
  }

  /**
   * Apply configuration (save)
   */
  private applyConfiguration(): void {
    this.callbacks.onSaveContext(this.currentContext);
  }
}
