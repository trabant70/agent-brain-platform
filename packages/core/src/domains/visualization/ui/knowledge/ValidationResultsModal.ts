/**
 * ValidationResultsModal - Display template validation results
 *
 * Shows comprehensive validation results with:
 * - Summary statistics
 * - Validation checklist (pass/fail per validator)
 * - Threats detected
 * - Detailed error log
 * - User decision (proceed/cancel)
 */

import { TemplateValidationResult } from '../../../knowledge/validation/types';
import { ModalDialog } from '../ModalDialog';
import { t, tf } from '../../webview/i18n';

export class ValidationResultsModal {
  /**
   * Show validation results modal
   * @param result - TemplateValidationResult from orchestrator
   * @param templateName - Name of template being validated
   * @returns Promise<'proceed' | 'cancel'> - User's decision
   */
  async show(
    result: TemplateValidationResult,
    templateName: string
  ): Promise<'proceed' | 'cancel'> {
    const modal = new ModalDialog();

    const hasIssues = result.errors.length > 0 || result.warnings.length > 0;
    const statusIcon = result.errors.length === 0 ? '✅' : '⚠️';
    const statusText = result.errors.length === 0 ? t('validation.allPassed') : t('validation.issuesDetected');

    const content = `
      <div style="padding: 20px;">
        ${this.renderSummary(result, statusIcon, statusText)}
        ${this.renderValidationChecklist(result)}
        ${this.renderThreatsDetected(result)}
        ${hasIssues ? this.renderUserDecisionNotice() : ''}
        ${this.renderDetailedLogSection(result)}
      </div>
    `;

    let userDecision: 'proceed' | 'cancel' = 'cancel';

    const modalPromise = modal.show({
      title: tf('modal.validationResults', { name: this.escapeHtml(templateName) }),
      content,
      buttons: result.errors.length > 0 || result.warnings.length > 0
        ? [
            {
              label: t('action.cancel'),
              primary: false,
              onClick: () => {
                userDecision = 'cancel';
              }
            },
            {
              label: t('action.proceedWithImport'),
              primary: true,
              onClick: () => {
                userDecision = 'proceed';
              }
            }
          ]
        : [
            {
              label: t('action.continue'),
              primary: true,
              onClick: () => {
                userDecision = 'proceed';
              }
            }
          ],
      width: '900px'
    });

    // Attach event listener for the validation log toggle (CSP-compliant)
    setTimeout(() => {
      const toggleButton = document.getElementById('validation-detail-toggle');
      const logContainer = document.getElementById('validation-detail-log');

      if (toggleButton && logContainer) {
        toggleButton.addEventListener('click', () => {
          if (logContainer.style.display === 'none') {
            logContainer.style.display = 'block';
            toggleButton.textContent = t('validation.hideDetailedLog');
          } else {
            logContainer.style.display = 'none';
            toggleButton.textContent = t('validation.showDetailedLog');
          }
        });
      }
    }, 0);

    await modalPromise;

    return userDecision;
  }

  /**
   * Render summary section
   */
  private renderSummary(result: TemplateValidationResult, statusIcon: string, statusText: string): string {
    const totalValidators = result.metadata.validatorChecks?.length || 0;
    const passedValidators = result.metadata.validatorChecks?.filter(v => v.passed).length || 0;
    const failedValidators = totalValidators - passedValidators;

    return `
      <div style="background: var(--vscode-textBlockQuote-background); border-left: 4px solid ${result.errors.length > 0 ? '#ff9800' : '#4caf50'}; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">
          ${statusIcon} ${statusText}
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: var(--vscode-textLink-activeForeground);">${totalValidators}</div>
            <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">${t('validation.validatorsRun')}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #4caf50;">${passedValidators}</div>
            <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">${t('validation.passed')}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: ${failedValidators > 0 ? '#f44336' : 'var(--vscode-foreground)'};">${failedValidators}</div>
            <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">${t('validation.failed')}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: var(--vscode-textLink-activeForeground);">${result.metadata.durationMs}ms</div>
            <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">${t('validation.executionTime')}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render validation checklist
   */
  private renderValidationChecklist(result: TemplateValidationResult): string {
    if (!result.metadata.validatorChecks || result.metadata.validatorChecks.length === 0) {
      return '';
    }

    const rows = result.metadata.validatorChecks.map(check => {
      const statusIcon = check.passed ? '✅' : (check.errors.length > 0 ? '❌' : '⚠️');
      const statusClass = check.passed ? 'pass' : (check.errors.length > 0 ? 'fail' : 'warning');
      const errorCount = check.errors.length + check.warnings.length;
      const categoryIcon = check.category === 'structure' ? '📐' : check.category === 'security' ? '🔒' : '💼';

      const errorType = errorCount === 1 ? t('validation.errorSingular') : t('validation.errorPlural');
      return `
        <tr>
          <td><span class="validator-status ${statusClass}" style="font-size: 18px;">${statusIcon}</span></td>
          <td style="font-weight: 500;">${this.escapeHtml(check.name)}</td>
          <td style="text-align: center; ${errorCount > 0 ? 'color: #f44336; font-weight: 600;' : ''}">${errorCount > 0 ? `⚠️ ${tf('validation.issueCount', { count: errorCount, type: errorType })}` : '-'}</td>
          <td>
            <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);">
              ${categoryIcon} ${this.capitalize(check.category)}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">${t('validation.checklist')}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--vscode-panel-border);">
              <th style="text-align: left; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.status')}</th>
              <th style="text-align: left; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.validator')}</th>
              <th style="text-align: center; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.issues')}</th>
              <th style="text-align: left; padding: 12px 8px; font-weight: 600; color: var(--vscode-descriptionForeground);">${t('column.category')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render threats detected section
   */
  private renderThreatsDetected(result: TemplateValidationResult): string {
    const threats = result.metadata.threatsDetected;
    const totalThreats = threats.xss + threats.injection + threats.pathTraversal + threats.promptInjection + threats.unicode + threats.other;

    if (totalThreats === 0) {
      return '';
    }

    const threatItems = [
      { label: t('threat.xss'), count: threats.xss },
      { label: t('threat.promptInjection'), count: threats.promptInjection },
      { label: t('threat.unicode'), count: threats.unicode },
      { label: t('threat.pathTraversal'), count: threats.pathTraversal },
      { label: t('threat.injection'), count: threats.injection },
      { label: t('threat.other'), count: threats.other }
    ].filter(item => item.count > 0);

    const threatRows = threatItems.map(item => `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(244, 67, 54, 0.2);">
        <span>${item.label}</span>
        <span style="font-weight: 600; color: #f44336;">${item.count}</span>
      </div>
    `).join('');

    return `
      <div style="padding: 16px; background: rgba(244, 67, 54, 0.1); border-left: 4px solid #f44336; border-radius: 4px; margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #f44336;">${t('validation.threatsSanitized')}</h3>
        ${threatRows}
        <div style="margin-top: 12px; font-size: 12px; color: var(--vscode-descriptionForeground);">
          ${t('validation.threatsAutomaticallySanitized')}
        </div>
      </div>
    `;
  }

  /**
   * Render user decision notice
   */
  private renderUserDecisionNotice(): string {
    return `
      <div style="padding: 16px; background: rgba(255, 152, 0, 0.1); border-left: 4px solid #ff9800; border-radius: 4px; margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #ff9800;">${t('validation.reviewAndDecide')}</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
          ${t('validation.decisionNotice')}
          <br><br>
          <strong>${t('validation.proceedingWillLabel')}</strong>
          <ul style="margin: 8px 0 0 20px; padding: 0;">
            <li>${t('validation.proceedingAction1')}</li>
            <li>${t('validation.proceedingAction2')}</li>
            <li>${t('validation.proceedingAction3')}</li>
          </ul>
        </p>
      </div>
    `;
  }

  /**
   * Render detailed log section (expandable)
   */
  private renderDetailedLogSection(result: TemplateValidationResult): string {
    if (result.errors.length === 0 && result.warnings.length === 0) {
      return `
        <div style="padding: 16px; background: rgba(76, 175, 80, 0.1); border-left: 4px solid #4caf50; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #4caf50; font-weight: 600;">${t('validation.noIssuesFound')}</p>
        </div>
      `;
    }

    const logEntries = [
      ...result.errors.map(err => `
        <div style="padding: 8px; margin-bottom: 8px; background: rgba(244, 67, 54, 0.1); border-left: 3px solid #f44336; border-radius: 2px;">
          <div style="font-weight: 600; color: #f44336; margin-bottom: 4px;">${t('validation.error')} ${this.escapeHtml(err.code)}</div>
          <div style="font-size: 13px; margin-bottom: 4px;">${this.escapeHtml(err.message)}</div>
          <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">
            <strong>${t('validation.field')}</strong> ${this.escapeHtml(err.field)}
            ${err.suggestion ? `<br><strong>${t('validation.suggestion')}</strong> ${this.escapeHtml(err.suggestion)}` : ''}
          </div>
        </div>
      `),
      ...result.warnings.map(warn => `
        <div style="padding: 8px; margin-bottom: 8px; background: rgba(255, 152, 0, 0.1); border-left: 3px solid #ff9800; border-radius: 2px;">
          <div style="font-weight: 600; color: #ff9800; margin-bottom: 4px;">${t('validation.warning')} ${this.escapeHtml(warn.code)}</div>
          <div style="font-size: 13px; margin-bottom: 4px;">${this.escapeHtml(warn.message)}</div>
          <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">
            <strong>${t('validation.field')}</strong> ${this.escapeHtml(warn.field)}
            ${warn.suggestion ? `<br><strong>${t('validation.suggestion')}</strong> ${this.escapeHtml(warn.suggestion)}` : ''}
          </div>
        </div>
      `)
    ].join('');

    return `
      <div style="margin-top: 24px;">
        <div id="validation-detail-toggle" style="cursor: pointer; color: var(--vscode-textLink-foreground); text-decoration: underline; font-weight: 600; margin-bottom: 12px;">${t('validation.showDetailedLog')}</div>
        <div id="validation-detail-log" style="display: none; max-height: 300px; overflow-y: auto; background: var(--vscode-editor-background); padding: 12px; border-radius: 4px; font-size: 12px;">
          ${logEntries}
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(str: string): string {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
