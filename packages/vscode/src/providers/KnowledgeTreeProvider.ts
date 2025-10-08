/**
 * KnowledgeTreeProvider
 *
 * VSCode TreeDataProvider for the Agent Brain knowledge sidebar
 * Shows ADRs, Patterns, and Learnings with friendly names and checkboxes
 */

import * as vscode from 'vscode';
import { ProjectProfileManager } from '@agent-brain/core/domains/knowledge/ProjectProfileManager';
import { ADRSystem } from '@agent-brain/core/domains/knowledge/adrs/ADRSystem';
import { PatternSystem } from '@agent-brain/core/domains/knowledge/patterns/PatternSystem';
import { LearningSystem } from '@agent-brain/core/domains/knowledge/learning/LearningSystem';

interface KnowledgeTreeItem extends vscode.TreeItem {
  itemId: string;
  itemType: 'category' | 'adr' | 'pattern' | 'learning';
  enabled?: boolean;
  data?: any;
}

export class KnowledgeTreeProvider implements vscode.TreeDataProvider<KnowledgeTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<KnowledgeTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private context: vscode.ExtensionContext,
    private profileManager: ProjectProfileManager,
    private adrSystem: ADRSystem,
    private patternSystem: PatternSystem,
    private learningSystem: LearningSystem
  ) {}

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation
   */
  getTreeItem(element: KnowledgeTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a tree item
   */
  async getChildren(element?: KnowledgeTreeItem): Promise<KnowledgeTreeItem[]> {
    if (!element) {
      // Root level - show categories
      return this.getRootCategories();
    }

    // Child level - show items in category
    return this.getCategoryItems(element);
  }

  /**
   * Get root categories
   */
  private async getRootCategories(): Promise<KnowledgeTreeItem[]> {
    const projectPath = this.getProjectPath();

    // Get counts for each category
    const adrCount = await this.getADRCount();
    const patternCount = await this.getPatternCount();
    const learningCount = await this.getLearningCount();

    return [
      {
        label: `📐 Project Rules (${adrCount})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        itemType: 'category',
        itemId: 'adrs',
        contextValue: 'category',
        tooltip: 'Architectural Decision Records - Key project decisions and guidelines'
      } as KnowledgeTreeItem,
      {
        label: `📋 Code Templates (${patternCount})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        itemType: 'category',
        itemId: 'patterns',
        contextValue: 'category',
        tooltip: 'Reusable code patterns and templates'
      } as KnowledgeTreeItem,
      {
        label: `⚠️ Mistakes to Avoid (${learningCount})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        itemType: 'category',
        itemId: 'learnings',
        contextValue: 'category',
        tooltip: 'Learnings from past errors and issues'
      } as KnowledgeTreeItem,
      {
        label: '🎯 Step-by-Step Guides (0)',
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        itemType: 'category',
        itemId: 'golden-paths',
        contextValue: 'category',
        description: '(Coming in Phase 4)',
        tooltip: 'Golden Path workflows for common tasks'
      } as KnowledgeTreeItem
    ];
  }

  /**
   * Get items for a category
   */
  private async getCategoryItems(category: KnowledgeTreeItem): Promise<KnowledgeTreeItem[]> {
    const projectPath = this.getProjectPath();

    switch (category.itemId) {
      case 'adrs':
        return this.getADRItems(projectPath);
      case 'patterns':
        return this.getPatternItems(projectPath);
      case 'learnings':
        return this.getLearningItems(projectPath);
      case 'golden-paths':
        return []; // Phase 4
      default:
        return [];
    }
  }

  /**
   * Get ADR items
   */
  private async getADRItems(projectPath: string): Promise<KnowledgeTreeItem[]> {
    try {
      const allADRs = await this.adrSystem.getADRs();
      const adrs = allADRs.filter(adr => adr.status === 'accepted' || adr.status === 'proposed');

      if (adrs.length === 0) {
        return [{
          label: 'No project rules yet',
          itemId: 'empty-adrs',
          itemType: 'category',
          contextValue: 'empty',
          description: 'Use "Record ADR" command to add',
          tooltip: 'No architectural decisions recorded yet'
        } as KnowledgeTreeItem];
      }

      const items: KnowledgeTreeItem[] = [];

      for (const adr of adrs) {
        const enabled = await this.profileManager.isItemEnabled(projectPath, adr.id);
        const checkbox = enabled ? '☑' : '☐';

        items.push({
          label: `${checkbox} ADR-${String(adr.number).padStart(3, '0')}: ${adr.title}`,
          itemId: adr.id,
          itemType: 'adr',
          enabled,
          data: adr,
          contextValue: 'adr-item',
          tooltip: new vscode.MarkdownString(this.formatADRTooltip(adr)),
          command: {
            command: 'agentBrain.toggleKnowledgeItem',
            title: 'Toggle Item',
            arguments: [adr.id, 'adr']
          },
          iconPath: enabled
            ? new vscode.ThemeIcon('check', new vscode.ThemeColor('terminal.ansiGreen'))
            : new vscode.ThemeIcon('circle-outline')
        } as KnowledgeTreeItem);
      }

      return items;
    } catch (error) {
      return [{
        label: 'Error loading project rules',
        itemId: 'error-adrs',
        itemType: 'category',
        contextValue: 'error',
        tooltip: `Error: ${error}`
      } as KnowledgeTreeItem];
    }
  }

  /**
   * Get Pattern items
   */
  private async getPatternItems(projectPath: string): Promise<KnowledgeTreeItem[]> {
    try {
      const patterns = await this.patternSystem.getPatterns();
      const activePatterns = patterns; // EnginePattern doesn't have deprecated field

      if (activePatterns.length === 0) {
        return [{
          label: 'No code templates yet',
          itemId: 'empty-patterns',
          itemType: 'category',
          contextValue: 'empty',
          description: 'Patterns will be captured automatically',
          tooltip: 'No code patterns documented yet'
        } as KnowledgeTreeItem];
      }

      const items: KnowledgeTreeItem[] = [];

      for (const pattern of activePatterns) {
        const enabled = await this.profileManager.isItemEnabled(projectPath, pattern.id);
        const checkbox = enabled ? '☑' : '☐';

        items.push({
          label: `${checkbox} ${pattern.name}`,
          itemId: pattern.id,
          itemType: 'pattern',
          enabled,
          data: pattern,
          contextValue: 'pattern-item',
          tooltip: new vscode.MarkdownString(this.formatPatternTooltip(pattern)),
          command: {
            command: 'agentBrain.toggleKnowledgeItem',
            title: 'Toggle Item',
            arguments: [pattern.id, 'pattern']
          },
          iconPath: enabled
            ? new vscode.ThemeIcon('check', new vscode.ThemeColor('terminal.ansiGreen'))
            : new vscode.ThemeIcon('circle-outline')
        } as KnowledgeTreeItem);
      }

      return items;
    } catch (error) {
      return [{
        label: 'Error loading code templates',
        itemId: 'error-patterns',
        itemType: 'category',
        contextValue: 'error',
        tooltip: `Error: ${error}`
      } as KnowledgeTreeItem];
    }
  }

  /**
   * Get Learning items
   */
  private async getLearningItems(projectPath: string): Promise<KnowledgeTreeItem[]> {
    try {
      // LearningSystem doesn't expose getLearnings() method yet
      // Return empty array for now - will be implemented in Phase 3
      const learnings: any[] = [];

      if (learnings.length === 0) {
        return [{
          label: 'No mistakes recorded',
          itemId: 'empty-learnings',
          itemType: 'category',
          contextValue: 'empty',
          description: 'This is good! ✨',
          tooltip: 'No learnings from past errors yet'
        } as KnowledgeTreeItem];
      }

      const items: KnowledgeTreeItem[] = [];

      for (const learning of learnings) {
        const enabled = await this.profileManager.isItemEnabled(projectPath, learning.id);
        const checkbox = enabled ? '☑' : '☐';

        items.push({
          label: `${checkbox} ${learning.name}`,
          itemId: learning.id,
          itemType: 'learning',
          enabled,
          data: learning,
          contextValue: 'learning-item',
          tooltip: new vscode.MarkdownString(this.formatLearningTooltip(learning)),
          command: {
            command: 'agentBrain.toggleKnowledgeItem',
            title: 'Toggle Item',
            arguments: [learning.id, 'learning']
          },
          iconPath: enabled
            ? new vscode.ThemeIcon('check', new vscode.ThemeColor('terminal.ansiYellow'))
            : new vscode.ThemeIcon('circle-outline')
        } as KnowledgeTreeItem);
      }

      return items;
    } catch (error) {
      return [{
        label: 'Error loading mistakes',
        itemId: 'error-learnings',
        itemType: 'category',
        contextValue: 'error',
        tooltip: `Error: ${error}`
      } as KnowledgeTreeItem];
    }
  }

  /**
   * Format ADR tooltip
   */
  private formatADRTooltip(adr: any): string {
    const lines: string[] = [];
    lines.push(`**ADR-${String(adr.number).padStart(3, '0')}: ${adr.title}**`);
    lines.push('');
    lines.push(`**Status:** ${adr.status}`);
    const timestamp = adr.timestamp instanceof Date ? adr.timestamp : new Date(adr.timestamp);
    lines.push(`**Date:** ${timestamp.toLocaleDateString()}`);
    lines.push('');
    lines.push(`**Context:**`);
    lines.push(adr.context);
    lines.push('');
    lines.push(`**Decision:**`);
    lines.push(adr.decision);

    return lines.join('\n');
  }

  /**
   * Format Pattern tooltip
   */
  private formatPatternTooltip(pattern: any): string {
    const lines: string[] = [];
    lines.push(`**${pattern.name}**`);
    lines.push('');
    lines.push(`**Category:** ${pattern.category || 'Uncategorized'}`);
    lines.push('');
    lines.push(`**Description:**`);
    lines.push(pattern.description || 'No description available');

    if (pattern.applicability) {
      lines.push('');
      lines.push(`**Applicability:**`);
      lines.push(pattern.applicability);
    }

    return lines.join('\n');
  }

  /**
   * Format Learning tooltip
   */
  private formatLearningTooltip(learning: any): string {
    const lines: string[] = [];
    lines.push(`**${learning.name}**`);
    lines.push('');
    lines.push(`**Category:** ${learning.category || 'General'}`);
    lines.push(`**Learned:** ${new Date(learning.learnedAt).toLocaleDateString()}`);
    lines.push(`**Occurrences:** ${learning.occurrences || 1}`);
    lines.push('');
    lines.push(`**Context:**`);
    lines.push(learning.context || 'No context available');

    if (learning.preventionRules && learning.preventionRules.length > 0) {
      lines.push('');
      lines.push(`**Prevention Rules:**`);
      learning.preventionRules.forEach((rule: string) => {
        lines.push(`- ${rule}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Get ADR count
   */
  private async getADRCount(): Promise<number> {
    try {
      const allADRs = await this.adrSystem.getADRs();
      const adrs = allADRs.filter(adr => adr.status === 'accepted' || adr.status === 'proposed');
      return adrs.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get Pattern count
   */
  private async getPatternCount(): Promise<number> {
    try {
      const patterns = await this.patternSystem.getPatterns();
      return patterns.length; // EnginePattern doesn't have deprecated field
    } catch {
      return 0;
    }
  }

  /**
   * Get Learning count
   */
  private async getLearningCount(): Promise<number> {
    try {
      // LearningSystem doesn't expose getLearnings() method yet
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get current project path
   */
  private getProjectPath(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders && workspaceFolders.length > 0
      ? workspaceFolders[0].uri.fsPath
      : '';
  }
}
