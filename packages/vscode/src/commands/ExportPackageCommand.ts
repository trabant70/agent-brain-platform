/**
 * Export Package Command (Phase 3)
 *
 * Allows users to export their knowledge (ADRs, patterns, learnings, context)
 * as an expertise package (.abp file) for sharing with team members.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { BaseCommand } from './BaseCommand';
import { KnowledgeSystem } from '@agent-brain/core/domains/knowledge';
import { PackageExporter } from '@agent-brain/core/domains/expertise';
import type { ExpertisePackage } from '@agent-brain/core/domains/expertise';

export class ExportPackageCommand extends BaseCommand {
  readonly id = 'agentBrain.exportPackage';

  constructor(private knowledgeSystem: KnowledgeSystem) {
    super();
  }

  protected async execute(): Promise<void> {
    // Get workspace info for default package name
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const projectName = workspaceFolders?.[0]?.name || 'my-project';

    // Step 1: Get package metadata from user
    const metadata = await this.getPackageMetadata(projectName);
    if (!metadata) {
      return; // User cancelled
    }

    // Step 2: Choose save location
    const fileUri = await vscode.window.showSaveDialog({
      saveLabel: 'Export Package',
      filters: {
        'Expertise Packages': ['json', 'abp'],
        'All Files': ['*']
      },
      defaultUri: vscode.Uri.file(`${metadata.name.replace(/\s+/g, '-').toLowerCase()}-package.json`),
      title: 'Save Expertise Package'
    });

    if (!fileUri) {
      return; // User cancelled
    }

    const filePath = fileUri.fsPath;

    // Step 3: Build and export package
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Agent Brain',
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ message: 'Gathering knowledge...' });

        // Build package from current knowledge
        const pkg = await this.buildPackage(metadata);

        progress.report({ message: 'Exporting package...' });

        // Get package manager
        const packageManager = (this.knowledgeSystem as any).packageManager;
        if (!packageManager) {
          throw new Error('Package manager not initialized. Please check extension configuration.');
        }

        // Temporarily add package to manager for export
        await packageManager.loadPackage(pkg);

        // Create exporter
        const exporter = new PackageExporter(packageManager);

        // Export
        const result = await exporter.exportToFile(pkg.id, filePath, {
          prettyPrint: true,
          includeTimestamp: true,
          includeDependencies: false,
          onProgress: (message) => {
            progress.report({ message });
          }
        });

        progress.report({ message: 'Export complete!' });

        // Show success message
        const sizeKB = (result.fileSize / 1024).toFixed(1);
        vscode.window.showInformationMessage(
          `✓ Package exported: ${metadata.name} (${sizeKB} KB)`,
          'Open File'
        ).then(selection => {
          if (selection === 'Open File') {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
          }
        });

        // Log details
        console.log(`[Agent Brain] Package exported:`, {
          name: metadata.name,
          filePath,
          size: result.fileSize,
          duration: result.duration
        });

      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export package: ${error}`);
        console.error('[Agent Brain] Export failed:', error);
      }
    });
  }

  /**
   * Get package metadata from user
   */
  private async getPackageMetadata(defaultName: string): Promise<{
    name: string;
    version: string;
    description: string;
    authority: string;
  } | undefined> {
    // Package name
    const name = await vscode.window.showInputBox({
      title: '📦 Export Expertise Package - Step 1/4',
      prompt: 'Package name',
      value: `${defaultName} Expertise`,
      validateInput: (value) => {
        return value.trim().length < 3 ? 'Name must be at least 3 characters' : null;
      }
    });

    if (!name) return undefined;

    // Version
    const version = await vscode.window.showInputBox({
      title: '📦 Export Expertise Package - Step 2/4',
      prompt: 'Package version',
      value: '1.0.0',
      placeHolder: 'e.g., 1.0.0',
      validateInput: (value) => {
        return /^\d+\.\d+\.\d+$/.test(value) ? null : 'Version must be in format: X.Y.Z';
      }
    });

    if (!version) return undefined;

    // Description
    const description = await vscode.window.showInputBox({
      title: '📦 Export Expertise Package - Step 3/4',
      prompt: 'Package description',
      placeHolder: 'e.g., Best practices and patterns for our team',
      validateInput: (value) => {
        return value.trim().length < 10 ? 'Description must be at least 10 characters' : null;
      }
    });

    if (!description) return undefined;

    // Authority level
    const authorityChoice = await vscode.window.showQuickPick([
      {
        label: 'Team Standard',
        description: 'Official team/organization standards (highest priority)',
        value: 'organization' as const
      },
      {
        label: 'Team Guidelines',
        description: 'Team-specific guidelines and patterns',
        value: 'team' as const
      },
      {
        label: 'Personal Knowledge',
        description: 'Personal expertise and preferences',
        value: 'personal' as const
      }
    ], {
      title: '📦 Export Expertise Package - Step 4/4',
      placeHolder: 'Select authority level'
    });

    if (!authorityChoice) return undefined;

    return {
      name,
      version,
      description,
      authority: authorityChoice.value
    };
  }

  /**
   * Build expertise package from current knowledge
   */
  private async buildPackage(metadata: {
    name: string;
    version: string;
    description: string;
    authority: string;
  }): Promise<ExpertisePackage> {
    // Get current knowledge summary
    const summary = await this.knowledgeSystem.getSummary();

    // Build package with correct structure
    const now = new Date().toISOString();

    const pkg: ExpertisePackage = {
      // Metadata
      id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      author: {
        name: 'Agent Brain User',
        role: 'Developer',
        organization: 'Agent Brain'
      },
      domain: 'general',

      // Authority & Enforcement
      authority: (metadata.authority === 'organization' ? 'organizational' :
                  metadata.authority === 'team' ? 'domain-expert' :
                  'community') as any,
      enforcement: 'recommended' as any,
      scope: {
        projects: [],
        languages: [],
        frameworks: []
      },

      // Content (TODO: Convert existing knowledge)
      rules: [],      // TODO: Convert ADRs to rules format
      patterns: [],   // TODO: Convert patterns to expertise format
      planningTemplates: [],  // TODO: Create templates from successful sessions
      validationCriteria: [],
      examples: [],

      // Behavior
      metadata: {
        created: now,
        updated: now,
        version: metadata.version,
        tags: [],
        changeLog: []
      },
      overrides: 'supplement' as any
    };

    return pkg;
  }
}
