/**
 * KnowledgeFileService
 *
 * Handles all file I/O operations for knowledge items and Claude.md files.
 * Responsible for:
 * - Scanning workspace for claude.md files
 * - Reading and writing claude.md content
 * - Setting up file watchers
 * - Ensuring directory structure exists
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ClaudeMdFile, TemplateEngine } from '@agent-brain/core/domains/knowledge';
import { KnowledgeFileSystem } from '@agent-brain/core/domains/knowledge';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export class KnowledgeFileService {
  private watchers: vscode.FileSystemWatcher[] = [];
  private knowledgeBaseDir: string;
  private fileSystem: KnowledgeFileSystem;
  private templateEngine: TemplateEngine;

  constructor(
    private workspaceRoot: string,
    fileSystem: KnowledgeFileSystem,
    templateEngine: TemplateEngine
  ) {
    this.knowledgeBaseDir = path.join(workspaceRoot, '.agent-brain');
    this.fileSystem = fileSystem;
    this.templateEngine = templateEngine;
  }

  /**
   * Ensure .agent-brain directory structure exists
   * V1 System uses flat template storage - only templates directory is needed
   */
  async ensureKnowledgeDirectory(): Promise<void> {
    const dirs = [
      this.knowledgeBaseDir,
      path.join(this.knowledgeBaseDir, 'templates')  // Current: unified template storage
    ];

    for (const dir of dirs) {
      try {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  /**
   * Scan workspace for claude.md files (case-insensitive)
   */
  async scanClaudeMdFiles(): Promise<ClaudeMdFile[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    logger.info(
      LogCategory.EXTENSION,
      'Scanning for claude.md files',
      'KnowledgeFileService.scanClaudeMdFiles',
      {
        workspaceRoot: this.workspaceRoot,
        workspaceFolderCount: workspaceFolders?.length || 0,
        workspaceFolders: workspaceFolders?.map(f => f.uri.fsPath) || []
      },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    if (!workspaceFolders || workspaceFolders.length === 0) {
      logger.warn(
        LogCategory.EXTENSION,
        'No workspace folders found - cannot scan for claude.md files',
        'KnowledgeFileService.scanClaudeMdFiles',
        {},
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return [];
    }

    try {
      // Search for both lowercase and uppercase variants
      const patterns = [
        'claude.md',          // Root lowercase
        'CLAUDE.md',          // Root uppercase
        '**/claude.md',       // Subdirs lowercase
        '**/CLAUDE.md',       // Subdirs uppercase
        '**/.claude/claude.md',  // .claude dir lowercase
        '**/.claude/CLAUDE.md'   // .claude dir uppercase
      ];

      // Find all files matching any pattern
      const filePromises = patterns.map(pattern =>
        vscode.workspace.findFiles(
          new vscode.RelativePattern(this.workspaceRoot, pattern),
          '**/node_modules/**'
        )
      );

      logger.debug(
        LogCategory.EXTENSION,
        'Searching for claude.md files with patterns',
        'KnowledgeFileService.scanClaudeMdFiles',
        { patterns, workspaceRoot: this.workspaceRoot },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const results = await Promise.all(filePromises);

      logger.debug(
        LogCategory.EXTENSION,
        'Search results by pattern',
        'KnowledgeFileService.scanClaudeMdFiles',
        {
          patternResults: patterns.map((pattern, i) => ({
            pattern,
            fileCount: results[i].length,
            files: results[i].map(f => f.fsPath)
          }))
        },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      // Flatten and deduplicate by path
      const allFiles = results.flat();
      const uniqueFiles = Array.from(new Set(allFiles.map(f => f.fsPath)))
        .map(filePath => allFiles.find(f => f.fsPath === filePath)!);

      logger.info(
        LogCategory.EXTENSION,
        'Found claude.md files',
        'KnowledgeFileService.scanClaudeMdFiles',
        { fileCount: uniqueFiles.length, files: uniqueFiles.map(f => f.fsPath) },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      const claudeFiles: ClaudeMdFile[] = [];

      for (const uri of uniqueFiles) {
        try {
          const content = await vscode.workspace.fs.readFile(uri);
          const contentStr = Buffer.from(content).toString('utf8');

          // Parse template sections
          const templates = this.templateEngine.parseTemplateMarkers(contentStr);

          // Validate markers
          const validation = this.templateEngine.validateTemplateMarkers(contentStr);

          claudeFiles.push({
            path: uri.fsPath,
            relativePath: this.fileSystem.getRelativePath(uri.fsPath),
            content: contentStr,
            templates,
            hasConflicts: !validation.valid,
            conflicts: validation.errors
          });

          logger.debug(
            LogCategory.EXTENSION,
            'Processed claude.md file',
            'KnowledgeFileService.scanClaudeMdFiles',
            {
              path: uri.fsPath,
              contentLength: contentStr.length,
              templateCount: templates.length,
              hasConflicts: !validation.valid
            },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        } catch (error) {
          logger.error(
            LogCategory.EXTENSION,
            'Failed to read claude.md file',
            'KnowledgeFileService.scanClaudeMdFiles',
            {
              path: uri.fsPath,
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined
            },
            LogPathway.KNOWLEDGE_MANAGEMENT
          );
        }
      }

      logger.info(
        LogCategory.EXTENSION,
        'Claude.md scan complete',
        'KnowledgeFileService.scanClaudeMdFiles',
        { filesProcessed: claudeFiles.length },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );

      return claudeFiles;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to scan claude.md files',
        'KnowledgeFileService.scanClaudeMdFiles',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      return [];
    }
  }

  /**
   * Update claude.md file content
   */
  async updateClaudeMdContent(filePath: string, content: string): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Updating claude.md file content',
      'KnowledgeFileService.updateClaudeMdContent',
      { filePath, contentLength: content.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    try {
      const fileUri = vscode.Uri.file(filePath);
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(content);

      await vscode.workspace.fs.writeFile(fileUri, contentBytes);

      logger.info(
        LogCategory.EXTENSION,
        'Claude.md file updated successfully',
        'KnowledgeFileService.updateClaudeMdContent',
        { filePath },
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to update claude.md file',
        'KnowledgeFileService.updateClaudeMdContent',
        error,
        LogPathway.KNOWLEDGE_MANAGEMENT
      );
      throw error;
    }
  }

  /**
   * Setup file watchers for .agent-brain directory
   * Watch template JSON files since items are embedded in templates
   */
  setupFileWatchers(onTemplateChange: (uri: vscode.Uri) => Promise<void>): void {
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.agent-brain/templates/**/*.json'
    );

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // File changed - reload all items from templates
    watcher.onDidChange(async (uri) => {
      await onTemplateChange(uri);
    });

    // File created - reload all items from templates
    watcher.onDidCreate(async (uri) => {
      await onTemplateChange(uri);
    });

    // File deleted - reload all items from templates
    watcher.onDidDelete(async (uri) => {
      await onTemplateChange(uri);
    });

    this.watchers.push(watcher);
  }

  /**
   * Dispose of file watchers
   */
  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
  }

  /**
   * Get knowledge base directory path
   */
  getKnowledgeBaseDir(): string {
    return this.knowledgeBaseDir;
  }
}
