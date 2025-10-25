/**
 * TemplateFileService
 *
 * Handles all file I/O operations for templates.
 * Responsible for:
 * - Loading templates from JSON files
 * - Saving templates to JSON files
 * - Loading bundled templates
 * - Migrating template directory structure
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MarketplaceTemplate, KnowledgeFileSystem, TemplateStore } from '@agent-brain/core/domains/knowledge';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export class TemplateFileService {
  private knowledgeBaseDir: string;
  private fileSystem: KnowledgeFileSystem;

  constructor(
    private workspaceRoot: string,
    private extensionContext: vscode.ExtensionContext,
    fileSystem: KnowledgeFileSystem
  ) {
    this.knowledgeBaseDir = path.join(workspaceRoot, '.agent-brain');
    this.fileSystem = fileSystem;
  }

  /**
   * Get path to bundled templates (shipped with extension)
   */
  private getBundledTemplatesPath(): string {
    // Templates are bundled in the extension dist folder
    return path.join(this.extensionContext.extensionPath, 'dist', 'knowledge', 'bundled-templates');
  }

  /**
   * Load templates from JSON files into TemplateStore
   */
  async loadTemplatesFromFiles(templateStore: TemplateStore): Promise<number> {
    try {
      const templatesDir = path.join(this.knowledgeBaseDir, 'templates');

      // Check if directory exists
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(templatesDir));
      } catch {
        logger.debug(
          LogCategory.EXTENSION,
          'Templates directory does not exist yet',
          'TemplateFileService.loadTemplatesFromFiles',
          { directory: templatesDir },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return 0;
      }

      // Find all .json files in subdirectories
      const pattern = new vscode.RelativePattern(templatesDir, '**/*.json');
      const files = await vscode.workspace.findFiles(pattern);

      let loadedCount = 0;
      for (const fileUri of files) {
        try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const json = Buffer.from(content).toString('utf8');

          const template = await this.fileSystem.loadTemplateJson(fileUri.fsPath, json);
          templateStore.loadTemplates([template]);
          loadedCount++;
        } catch (error) {
          logger.warn(
            LogCategory.EXTENSION,
            'Failed to load template file',
            'TemplateFileService.loadTemplatesFromFiles',
            { file: fileUri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Loaded templates from files',
        'TemplateFileService.loadTemplatesFromFiles',
        { loadedCount, totalFiles: files.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return loadedCount;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load templates from files',
        'TemplateFileService.loadTemplatesFromFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return 0;
    }
  }

  /**
   * Save TemplateStore contents to JSON files
   * Uses flat structure - all templates in single directory
   */
  async saveTemplatesToFiles(templateStore: TemplateStore): Promise<void> {
    try {
      const templates = templateStore.getAllTemplates();
      const templatesDir = path.join(this.knowledgeBaseDir, 'templates');

      // Ensure directory exists (flat structure - single directory)
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(templatesDir));

      for (const template of templates) {
        const filePath = this.fileSystem.getTemplateFilePath(template, templatesDir);
        const json = this.fileSystem.toTemplateJson(template);

        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(filePath),
          Buffer.from(json, 'utf8')
        );
      }

      logger.info(
        LogCategory.EXTENSION,
        'Saved templates to files',
        'TemplateFileService.saveTemplatesToFiles',
        { templateCount: templates.length, directory: templatesDir },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to save templates to files',
        'TemplateFileService.saveTemplatesToFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Load bundled templates into TemplateStore
   * Bundled templates are always available and cannot be deleted
   */
  async loadBundledTemplates(templateStore: TemplateStore): Promise<number> {
    try {
      const bundledPath = this.getBundledTemplatesPath();
      const templatesDir = path.join(this.knowledgeBaseDir, 'templates');

      logger.info(
        LogCategory.EXTENSION,
        'Loading bundled templates',
        'TemplateFileService.loadBundledTemplates',
        { bundledPath, templatesDir },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Check if bundled templates directory exists
      if (!fs.existsSync(bundledPath)) {
        logger.warn(
          LogCategory.EXTENSION,
          'Bundled templates directory not found',
          'TemplateFileService.loadBundledTemplates',
          { bundledPath },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        return 0;
      }

      // Ensure user templates directory exists before copying
      if (!fs.existsSync(templatesDir)) {
        logger.debug(
          LogCategory.EXTENSION,
          'Creating user templates directory',
          'TemplateFileService.loadBundledTemplates',
          { templatesDir },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Read all JSON files from bundled templates directory
      const files = fs.readdirSync(bundledPath).filter(f => f.endsWith('.json'));

      logger.debug(
        LogCategory.EXTENSION,
        'Found bundled template files',
        'TemplateFileService.loadBundledTemplates',
        { filesCount: files.length, files },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      let loadedCount = 0;
      let copiedCount = 0;
      for (const file of files) {
        try {
          const filePath = path.join(bundledPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const template = await this.fileSystem.loadTemplateJson(filePath, content);

          // Check if template already exists in user templates directory
          const userTemplateFileName = this.fileSystem.generateTemplateFileName(template);
          const userTemplatePath = path.join(templatesDir, userTemplateFileName);

          if (!fs.existsSync(userTemplatePath)) {
            // Copy bundled template to user templates directory
            logger.info(
              LogCategory.EXTENSION,
              'Copying bundled template to user templates',
              'TemplateFileService.loadBundledTemplates',
              { templateId: template.id, name: template.name, targetPath: userTemplatePath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
            fs.writeFileSync(userTemplatePath, content, 'utf-8');
            copiedCount++;
            logger.info(
              LogCategory.EXTENSION,
              'Successfully copied bundled template',
              'TemplateFileService.loadBundledTemplates',
              { templateId: template.id, name: template.name, fileSize: content.length },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          } else {
            logger.debug(
              LogCategory.EXTENSION,
              'Template already exists in user templates, skipping copy',
              'TemplateFileService.loadBundledTemplates',
              { templateId: template.id, name: template.name, existingPath: userTemplatePath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }

          // Add to TemplateStore (bundled templates are always added, never replaced by user templates)
          templateStore.loadTemplates([template]);
          loadedCount++;

          logger.debug(
            LogCategory.EXTENSION,
            'Loaded bundled template',
            'TemplateFileService.loadBundledTemplates',
            { templateId: template.id, name: template.name, itemCount: template.items?.length || 0 },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } catch (error) {
          logger.error(
            LogCategory.EXTENSION,
            'Failed to load bundled template file',
            'TemplateFileService.loadBundledTemplates',
            { file, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Bundled templates loaded',
        'TemplateFileService.loadBundledTemplates',
        { loadedCount, copiedCount, totalFiles: files.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return loadedCount;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load bundled templates',
        'TemplateFileService.loadBundledTemplates',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return 0;
    }
  }

  /**
   * Migrate templates from old subdirectory structure to flat structure
   * Old: .agent-brain/templates/bundled/*.json, user/*.json, etc.
   * New: .agent-brain/templates/*.json
   */
  async migrateToFlatStructure(): Promise<void> {
    try {
      const templatesDir = path.join(this.knowledgeBaseDir, 'templates');
      const subdirectories = ['bundled', 'user', 'cloned', 'imported'];

      // Find all JSON files
      const pattern = new vscode.RelativePattern(templatesDir, '**/*.json');
      const allFiles = await vscode.workspace.findFiles(pattern);

      let migratedCount = 0;
      const filesToDelete: vscode.Uri[] = [];

      // Check if any files are in subdirectories
      for (const fileUri of allFiles) {
        const relativePath = path.relative(templatesDir, fileUri.fsPath);
        const parts = relativePath.split(path.sep);

        // If file is in a subdirectory (not directly in templates/)
        if (parts.length > 1 && subdirectories.includes(parts[0])) {
          const fileName = path.basename(fileUri.fsPath);
          const newPath = path.join(templatesDir, fileName);

          // Check if file already exists at root level
          try {
            await vscode.workspace.fs.stat(vscode.Uri.file(newPath));
            // File exists at root - just delete the subdirectory copy
            filesToDelete.push(fileUri);
            logger.debug(
              LogCategory.EXTENSION,
              'Template already migrated, will delete old copy',
              'TemplateFileService.migrateToFlatStructure',
              { oldPath: fileUri.fsPath, newPath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          } catch {
            // File doesn't exist at root - move it
            const content = await vscode.workspace.fs.readFile(fileUri);
            await vscode.workspace.fs.writeFile(vscode.Uri.file(newPath), content);
            filesToDelete.push(fileUri);
            migratedCount++;

            logger.debug(
              LogCategory.EXTENSION,
              'Migrated template to flat structure',
              'TemplateFileService.migrateToFlatStructure',
              { oldPath: fileUri.fsPath, newPath },
              LogPathway.KNOWLEDGE_MANAGEMENT
            );
          }
        }
      }

      // Delete old files from subdirectories
      for (const fileUri of filesToDelete) {
        try {
          await vscode.workspace.fs.delete(fileUri);
        } catch (error) {
          logger.warn(
            LogCategory.EXTENSION,
            'Failed to delete old template file',
            'TemplateFileService.migrateToFlatStructure',
            { file: fileUri.fsPath, error },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      // Try to delete empty subdirectories
      for (const subdir of subdirectories) {
        const subdirPath = path.join(templatesDir, subdir);
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(subdirPath), { recursive: false });
          logger.debug(
            LogCategory.EXTENSION,
            'Deleted empty subdirectory',
            'TemplateFileService.migrateToFlatStructure',
            { subdirectory: subdirPath },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } catch {
          // Ignore errors - directory may not exist or may not be empty
        }
      }

      if (migratedCount > 0) {
        logger.info(
          LogCategory.EXTENSION,
          'Migrated templates to flat structure',
          'TemplateFileService.migrateToFlatStructure',
          { migratedCount, deletedCount: filesToDelete.length },
          LogPathway.KNOWLEDGE_MANAGEMENT
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Error during flat structure migration',
        'TemplateFileService.migrateToFlatStructure',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      // Don't throw - migration failure shouldn't break template loading
    }
  }
}
