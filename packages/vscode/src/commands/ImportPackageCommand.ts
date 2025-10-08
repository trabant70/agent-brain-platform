/**
 * Import Package Command (Phase 3)
 *
 * Allows users to import expertise packages (.abp files)
 * from the file system.
 */

import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { KnowledgeSystem } from '@agent-brain/core/domains/knowledge';
import { PackageImporter } from '@agent-brain/core/domains/expertise';

export class ImportPackageCommand extends BaseCommand {
  readonly id = 'agentBrain.importPackage';

  constructor(private knowledgeSystem: KnowledgeSystem) {
    super();
  }

  protected async execute(): Promise<void> {
    // Show file picker
    const fileUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Import Package',
      filters: {
        'Expertise Packages': ['json', 'abp'],
        'All Files': ['*']
      },
      title: 'Select Expertise Package to Import'
    });

    if (!fileUri || fileUri.length === 0) {
      return; // User cancelled
    }

    const filePath = fileUri[0].fsPath;

    // Import with progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Agent Brain',
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ message: 'Importing package...' });

        // Get package manager from knowledge system
        const packageManager = (this.knowledgeSystem as any).packageManager;
        if (!packageManager) {
          throw new Error('Package manager not initialized. Please check extension configuration.');
        }

        // Create importer
        const importer = new PackageImporter(packageManager);

        // Import with progress callback
        const result = await importer.importFromFile(filePath, {
          validate: true,
          checkConflicts: true,
          autoResolve: true,
          onProgress: (message) => {
            progress.report({ message });
          }
        });

        progress.report({ message: 'Import complete!' });

        // Show success message
        const packageName = result.package.name;
        const hasConflicts = result.conflicts && result.conflicts.length > 0;

        let message = `✓ Package imported: ${packageName}`;
        if (hasConflicts) {
          message += ` (${result.conflicts!.length} conflicts auto-resolved)`;
        }

        vscode.window.showInformationMessage(message);

        // Log details
        console.log(`[Agent Brain] Package imported:`, {
          name: packageName,
          version: result.package.version,
          authority: result.package.authority,
          rulesCount: result.package.rules?.length || 0,
          patternsCount: result.package.patterns?.length || 0,
          duration: result.duration
        });

      } catch (error) {
        vscode.window.showErrorMessage(`Failed to import package: ${error}`);
        console.error('[Agent Brain] Import failed:', error);
      }
    });
  }
}
