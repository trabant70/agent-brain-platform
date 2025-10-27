/**
 * MaturityRangeSelector
 *
 * Interactive 5×5 grid component for selecting maturity ranges for knowledge items.
 * Allows users to define which operator/project maturity cells a knowledge item applies to.
 *
 * Features:
 * - Visual 5×5 grid (Operator × Project maturity)
 * - Click-and-drag to select rectangular range
 * - Clear visual feedback of selected range
 * - Complexity dropdown (Simple/Standard/Complex)
 */

import { MaturityFootprint, MaturityRange, DomainComplexity } from '../../../knowledge/types';
import { t } from '../../webview/i18n';

export interface MaturityRangeSelectorCallbacks {
  onRangeChanged: (footprint: MaturityFootprint | undefined) => void;
}

export class MaturityRangeSelector {
  private container: HTMLElement | null = null;
  private currentFootprint: MaturityFootprint | undefined;
  private isSelecting: boolean = false;
  private selectionStart: { row: number; col: number } | null = null;

  constructor(private callbacks: MaturityRangeSelectorCallbacks) {}

  /**
   * Set current maturity footprint (for editing existing items)
   */
  setFootprint(footprint: MaturityFootprint | undefined): void {
    this.currentFootprint = footprint;
    if (this.container) {
      this.render();
    }
  }

  /**
   * Get current maturity footprint
   */
  getFootprint(): MaturityFootprint | undefined {
    return this.currentFootprint;
  }

  /**
   * Render the maturity range selector
   */
  render(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'maturity-range-selector';

    section.innerHTML = `
      <div class="maturity-range-header">
        <h4>${t('maturity.rangeSelector.title', 'Maturity Range')}</h4>
        <p class="help-text">${t('maturity.rangeSelector.help', 'Select which operator and project maturity levels this item applies to')}</p>
      </div>

      <!-- Complexity Selector -->
      <div class="complexity-selector" style="margin-bottom: 16px;">
        <label>
          ${t('maturity.complexity', 'Complexity')}:
          <select id="maturity-complexity-select" style="margin-left: 8px; padding: 4px 8px;">
            <option value="">${t('maturity.complexity.any', 'Any')}</option>
            <option value="simple">${t('maturity.complexity.simple', 'Simple')}</option>
            <option value="standard">${t('maturity.complexity.standard', 'Standard')}</option>
            <option value="complex">${t('maturity.complexity.complex', 'Complex')}</option>
          </select>
        </label>
      </div>

      <!-- 5×5 Grid Container -->
      <div class="maturity-grid-container">
        ${this.renderGrid()}
      </div>

      <!-- Selection Info -->
      <div class="maturity-range-info" id="maturity-range-info" style="margin-top: 12px; font-size: 12px; color: var(--vscode-descriptionForeground);">
        ${this.getSelectionInfo()}
      </div>

      <!-- Actions -->
      <div class="maturity-range-actions" style="margin-top: 12px;">
        <button id="maturity-clear-btn" class="btn-secondary" style="font-size: 12px; padding: 4px 12px;">
          ${t('maturity.clearRange', 'Clear Range')}
        </button>
        <button id="maturity-select-all-btn" class="btn-secondary" style="font-size: 12px; padding: 4px 12px; margin-left: 8px;">
          ${t('maturity.selectAll', 'Select All')}
        </button>
      </div>
    `;

    this.container = section;
    this.attachEventListeners();
    this.updateComplexitySelect();
    return section;
  }

  /**
   * Render the 5×5 maturity grid
   */
  private renderGrid(): string {
    const operatorLevels = [
      { level: 5, label: t('maturity.operator.expert', 'Expert') },
      { level: 4, label: t('maturity.operator.advanced', 'Advanced') },
      { level: 3, label: t('maturity.operator.competent', 'Competent') },
      { level: 2, label: t('maturity.operator.beginner', 'Beginner') },
      { level: 1, label: t('maturity.operator.novice', 'Novice') }
    ];

    const projectLevels = [
      { level: 1, label: t('maturity.project.planning', 'Planning') },
      { level: 2, label: t('maturity.project.development', 'Dev') },
      { level: 3, label: t('maturity.project.testing', 'Testing') },
      { level: 4, label: t('maturity.project.production', 'Prod') },
      { level: 5, label: t('maturity.project.mature', 'Mature') }
    ];

    let html = '<table class="maturity-grid" style="border-collapse: collapse; user-select: none;">';

    // Header row (Project maturity)
    html += '<tr><th></th>';
    projectLevels.forEach(p => {
      html += `<th style="text-align: center; font-size: 11px; padding: 4px;">${p.label}</th>`;
    });
    html += '</tr>';

    // Grid rows (Operator maturity)
    operatorLevels.forEach(op => {
      html += '<tr>';
      html += `<th style="text-align: right; font-size: 11px; padding: 4px 8px;">${op.label}</th>`;

      projectLevels.forEach(proj => {
        const isSelected = this.isCellSelected(op.level, proj.level);
        const cellClass = isSelected ? 'maturity-cell selected' : 'maturity-cell';
        html += `
          <td class="${cellClass}"
              data-operator="${op.level}"
              data-project="${proj.level}"
              style="width: 40px; height: 40px; text-align: center; border: 1px solid var(--vscode-panel-border); cursor: pointer; background: ${isSelected ? 'var(--vscode-button-background)' : 'transparent'};">
          </td>
        `;
      });

      html += '</tr>';
    });

    html += '</table>';
    return html;
  }

  /**
   * Check if a cell is selected based on current footprint
   */
  private isCellSelected(operatorLevel: number, projectLevel: number): boolean {
    if (!this.currentFootprint) return false;

    const { operator, project } = this.currentFootprint;
    return operatorLevel >= operator.min && operatorLevel <= operator.max &&
           projectLevel >= project.min && projectLevel <= project.max;
  }

  /**
   * Get selection info text
   */
  private getSelectionInfo(): string {
    if (!this.currentFootprint) {
      return t('maturity.rangeSelector.noSelection', 'No range selected - item applies to all contexts');
    }

    const { operator, project, complexity } = this.currentFootprint;
    const opRange = operator.min === operator.max ?
      `${operator.min}` : `${operator.min}-${operator.max}`;
    const projRange = project.min === project.max ?
      `${project.min}` : `${project.min}-${project.max}`;

    let info = `Operator: ${opRange}, Project: ${projRange}`;
    if (complexity.min !== 1 || complexity.max !== 3) {
      const compRange = complexity.min === complexity.max ?
        `${complexity.min}` : `${complexity.min}-${complexity.max}`;
      info += `, Complexity: ${compRange}`;
    }

    return info;
  }

  /**
   * Update complexity select dropdown
   */
  private updateComplexitySelect(): void {
    const select = this.container?.querySelector('#maturity-complexity-select') as HTMLSelectElement;
    if (!select) return;

    if (!this.currentFootprint) {
      select.value = '';
    } else {
      const { complexity } = this.currentFootprint;
      if (complexity.min === 1 && complexity.max === 1) select.value = 'simple';
      else if (complexity.min === 2 && complexity.max === 2) select.value = 'standard';
      else if (complexity.min === 3 && complexity.max === 3) select.value = 'complex';
      else select.value = '';
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Grid cell mouse events
    const cells = this.container.querySelectorAll('.maturity-cell');
    cells.forEach(cell => {
      cell.addEventListener('mousedown', (e) => this.handleCellMouseDown(e as MouseEvent));
      cell.addEventListener('mouseenter', (e) => this.handleCellMouseEnter(e as MouseEvent));
      cell.addEventListener('mouseup', () => this.handleCellMouseUp());
    });

    // Document-level mouseup to end selection
    document.addEventListener('mouseup', () => this.handleCellMouseUp());

    // Complexity select
    const complexitySelect = this.container.querySelector('#maturity-complexity-select');
    complexitySelect?.addEventListener('change', (e) => {
      this.handleComplexityChange((e.target as HTMLSelectElement).value);
    });

    // Clear button
    const clearBtn = this.container.querySelector('#maturity-clear-btn');
    clearBtn?.addEventListener('click', () => this.clearSelection());

    // Select All button
    const selectAllBtn = this.container.querySelector('#maturity-select-all-btn');
    selectAllBtn?.addEventListener('click', () => this.selectAll());
  }

  /**
   * Handle mouse down on cell - start selection
   */
  private handleCellMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const cell = e.target as HTMLElement;
    const operator = parseInt(cell.dataset.operator || '0');
    const project = parseInt(cell.dataset.project || '0');

    this.isSelecting = true;
    this.selectionStart = { row: operator, col: project };
    this.updateSelection(operator, project);
  }

  /**
   * Handle mouse enter on cell - update selection during drag
   */
  private handleCellMouseEnter(e: MouseEvent): void {
    if (!this.isSelecting || !this.selectionStart) return;

    const cell = e.target as HTMLElement;
    const operator = parseInt(cell.dataset.operator || '0');
    const project = parseInt(cell.dataset.project || '0');

    this.updateSelection(operator, project);
  }

  /**
   * Handle mouse up - end selection
   */
  private handleCellMouseUp(): void {
    this.isSelecting = false;
    this.selectionStart = null;
  }

  /**
   * Update selection based on current and start cell
   */
  private updateSelection(currentOperator: number, currentProject: number): void {
    if (!this.selectionStart) return;

    const operatorMin = Math.min(this.selectionStart.row, currentOperator);
    const operatorMax = Math.max(this.selectionStart.row, currentOperator);
    const projectMin = Math.min(this.selectionStart.col, currentProject);
    const projectMax = Math.max(this.selectionStart.col, currentProject);

    // Get current complexity or default to any
    const complexity = this.currentFootprint?.complexity || { min: 1, max: 3 };

    this.currentFootprint = {
      operator: { min: operatorMin, max: operatorMax },
      project: { min: projectMin, max: projectMax },
      complexity
    };

    this.callbacks.onRangeChanged(this.currentFootprint);
    this.render();
  }

  /**
   * Handle complexity change
   */
  private handleComplexityChange(value: string): void {
    let complexity: MaturityRange;

    switch (value) {
      case 'simple': complexity = { min: 1, max: 1 }; break;
      case 'standard': complexity = { min: 2, max: 2 }; break;
      case 'complex': complexity = { min: 3, max: 3 }; break;
      default: complexity = { min: 1, max: 3 }; // Any
    }

    if (this.currentFootprint) {
      this.currentFootprint.complexity = complexity;
      this.callbacks.onRangeChanged(this.currentFootprint);
    } else {
      // If no operator/project range selected yet, create a default full range
      this.currentFootprint = {
        operator: { min: 1, max: 5 },
        project: { min: 1, max: 5 },
        complexity
      };
      this.callbacks.onRangeChanged(this.currentFootprint);
    }

    this.updateSelectionInfo();
  }

  /**
   * Clear selection
   */
  private clearSelection(): void {
    this.currentFootprint = undefined;
    this.callbacks.onRangeChanged(undefined);
    this.render();
  }

  /**
   * Select all cells
   */
  private selectAll(): void {
    this.currentFootprint = {
      operator: { min: 1, max: 5 },
      project: { min: 1, max: 5 },
      complexity: { min: 1, max: 3 }
    };
    this.callbacks.onRangeChanged(this.currentFootprint);
    this.render();
  }

  /**
   * Update selection info text
   */
  private updateSelectionInfo(): void {
    const infoElement = this.container?.querySelector('#maturity-range-info');
    if (infoElement) {
      infoElement.textContent = this.getSelectionInfo();
    }
  }
}
