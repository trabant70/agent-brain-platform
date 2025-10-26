/**
 * LevelMigrationManager - Safe migration between threading maturity levels
 *
 * Handles upgrade and downgrade between levels with automatic backup,
 * validation, and rollback capabilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MaturityLevel } from '../types';

export interface MigrationConfig {
  workspacePath: string;
  fromLevel: MaturityLevel;
  toLevel: MaturityLevel;
  targetFiles?: string[]; // Specific files to migrate
  dryRun?: boolean;       // Preview changes without applying
  createBackup?: boolean; // Backup before migration
  validateAfter?: boolean; // Validate after migration
}

export interface MigrationResult {
  success: boolean;
  fromLevel: MaturityLevel;
  toLevel: MaturityLevel;
  filesModified: string[];
  backupPath?: string;
  errors: string[];
  warnings: string[];
  summary: string;
}

export interface MigrationStep {
  description: string;
  transform: (content: string, filePath: string) => string;
  validate?: (content: string) => boolean;
}

export class LevelMigrationManager {
  private config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = {
      dryRun: false,
      createBackup: true,
      validateAfter: true,
      ...config
    };
  }

  /**
   * Execute migration from one level to another
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromLevel: this.config.fromLevel,
      toLevel: this.config.toLevel,
      filesModified: [],
      errors: [],
      warnings: [],
      summary: ''
    };

    try {
      // Validate migration path
      if (!this.isValidMigrationPath()) {
        result.errors.push(`Invalid migration path: L${this.config.fromLevel} → L${this.config.toLevel}`);
        result.summary = 'Migration validation failed';
        return result;
      }

      // Get migration steps
      const steps = this.getMigrationSteps();

      // Create backup if enabled
      if (this.config.createBackup && !this.config.dryRun) {
        result.backupPath = await this.createBackup();
      }

      // Get files to migrate
      const files = await this.getFilesToMigrate();

      // Apply migration to each file
      for (const filePath of files) {
        try {
          const originalContent = fs.readFileSync(filePath, 'utf-8');
          let transformedContent = originalContent;

          // Apply each migration step
          for (const step of steps) {
            transformedContent = step.transform(transformedContent, filePath);

            // Validate step if validator provided
            if (step.validate && !step.validate(transformedContent)) {
              throw new Error(`Validation failed: ${step.description}`);
            }
          }

          // Check if content actually changed
          if (transformedContent !== originalContent) {
            if (!this.config.dryRun) {
              fs.writeFileSync(filePath, transformedContent, 'utf-8');
            }
            result.filesModified.push(this.relativePath(filePath));
          }
        } catch (error: any) {
          result.errors.push(`Failed to migrate ${this.relativePath(filePath)}: ${error.message}`);
        }
      }

      // Validate after migration if enabled
      if (this.config.validateAfter && !this.config.dryRun) {
        const validationErrors = await this.validateMigration();
        result.errors.push(...validationErrors);
      }

      // Determine success
      result.success = result.errors.length === 0;
      result.summary = this.generateSummary(result);

      return result;
    } catch (error: any) {
      result.errors.push(`Migration failed: ${error.message}`);
      result.summary = 'Migration error';
      return result;
    }
  }

  /**
   * Rollback to previous state using backup
   */
  async rollback(backupPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupPath}`);
      }

      // Restore from backup
      const backupFiles = this.getBackupFiles(backupPath);

      for (const { original, backup } of backupFiles) {
        if (fs.existsSync(backup)) {
          const content = fs.readFileSync(backup, 'utf-8');
          fs.writeFileSync(original, content, 'utf-8');
        }
      }

      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Preview migration changes without applying
   */
  async preview(): Promise<string> {
    this.config.dryRun = true;
    const result = await this.migrate();

    let preview = `Migration Preview: L${this.config.fromLevel} → L${this.config.toLevel}\n\n`;
    preview += `Files to be modified: ${result.filesModified.length}\n\n`;

    if (result.filesModified.length > 0) {
      preview += 'Files:\n';
      result.filesModified.forEach(file => {
        preview += `  - ${file}\n`;
      });
    }

    if (result.warnings.length > 0) {
      preview += '\nWarnings:\n';
      result.warnings.forEach(warning => {
        preview += `  ⚠️  ${warning}\n`;
      });
    }

    if (result.errors.length > 0) {
      preview += '\nErrors:\n';
      result.errors.forEach(error => {
        preview += `  ❌ ${error}\n`;
      });
    }

    return preview;
  }

  /**
   * Check if migration path is valid
   */
  private isValidMigrationPath(): boolean {
    const { fromLevel, toLevel } = this.config;

    // Can't migrate to same level
    if (fromLevel === toLevel) {
      return false;
    }

    // Level must be 0-4
    if (fromLevel < 0 || fromLevel > 4 || toLevel < 0 || toLevel > 4) {
      return false;
    }

    // Only support adjacent or +2 level jumps
    const gap = Math.abs(toLevel - fromLevel);
    return gap <= 2;
  }

  /**
   * Get migration steps based on path
   */
  private getMigrationSteps(): MigrationStep[] {
    const { fromLevel, toLevel } = this.config;

    if (toLevel > fromLevel) {
      // Upgrade
      return this.getUpgradeSteps(fromLevel, toLevel);
    } else {
      // Downgrade
      return this.getDowngradeSteps(fromLevel, toLevel);
    }
  }

  /**
   * Get upgrade steps
   */
  private getUpgradeSteps(from: MaturityLevel, to: MaturityLevel): MigrationStep[] {
    const steps: MigrationStep[] = [];

    // L0 → L1: Add [THREAD:X] prefixes
    if (from === MaturityLevel.OBSERVATION && to >= MaturityLevel.SEMANTIC) {
      steps.push({
        description: 'Add [THREAD:X] prefixes to logs',
        transform: (content, filePath) => {
          return this.addThreadPrefixes(content);
        }
      });
    }

    // L1 → L2: Generate JSDoc @thread
    if (from <= MaturityLevel.SEMANTIC && to >= MaturityLevel.ANNOTATION) {
      steps.push({
        description: 'Generate JSDoc @thread annotations',
        transform: (content, filePath) => {
          return this.addJSDocThreadAnnotations(content);
        }
      });
    }

    // L2 → L3: Generate ThreadContext
    if (from <= MaturityLevel.ANNOTATION && to >= MaturityLevel.CONDITIONAL) {
      steps.push({
        description: 'Wrap in ThreadContext.run()',
        transform: (content, filePath) => {
          return this.wrapInThreadContext(content);
        }
      });
    }

    // L3 → L4: Generate @ThreadSpec decorators
    if (from <= MaturityLevel.CONDITIONAL && to === MaturityLevel.DECORATOR) {
      steps.push({
        description: 'Add @ThreadSpec decorators',
        transform: (content, filePath) => {
          return this.addThreadSpecDecorators(content);
        }
      });
    }

    return steps;
  }

  /**
   * Get downgrade steps
   */
  private getDowngradeSteps(from: MaturityLevel, to: MaturityLevel): MigrationStep[] {
    const steps: MigrationStep[] = [];

    // L4 → L3: Remove decorators, keep ThreadContext
    if (from === MaturityLevel.DECORATOR && to <= MaturityLevel.CONDITIONAL) {
      steps.push({
        description: 'Remove @ThreadSpec decorators',
        transform: (content) => {
          return this.removeThreadSpecDecorators(content);
        }
      });
    }

    // L3 → L2: Unwrap ThreadContext, keep JSDoc
    if (from <= MaturityLevel.CONDITIONAL && to <= MaturityLevel.ANNOTATION) {
      steps.push({
        description: 'Unwrap ThreadContext.run()',
        transform: (content) => {
          return this.unwrapThreadContext(content);
        }
      });
    }

    // L2 → L1: Remove JSDoc, keep log prefixes
    if (from <= MaturityLevel.ANNOTATION && to <= MaturityLevel.SEMANTIC) {
      steps.push({
        description: 'Remove JSDoc @thread annotations',
        transform: (content) => {
          return this.removeJSDocThreadAnnotations(content);
        }
      });
    }

    // L1 → L0: Remove thread prefixes
    if (from <= MaturityLevel.SEMANTIC && to === MaturityLevel.OBSERVATION) {
      steps.push({
        description: 'Remove [THREAD:X] prefixes',
        transform: (content) => {
          return this.removeThreadPrefixes(content);
        }
      });
    }

    return steps;
  }

  /**
   * L0 → L1: Add [THREAD:X] prefixes to logs
   */
  private addThreadPrefixes(content: string): string {
    // Identify logs and add thread prefixes based on context
    const patterns = [
      { pattern: /console\.(log|info|debug|warn|error)\(['"`](.*?)['"`]/g, replacement: (match: string, level: string, msg: string) => {
        const thread = this.inferThreadFromMessage(msg);
        return `console.${level}('[THREAD:${thread}] ${msg}'`;
      }},
      { pattern: /logger\.(log|info|debug|warn|error)\(['"`](.*?)['"`]/g, replacement: (match: string, level: string, msg: string) => {
        const thread = this.inferThreadFromMessage(msg);
        return `logger.${level}('[THREAD:${thread}] ${msg}'`;
      }}
    ];

    let result = content;
    for (const { pattern, replacement } of patterns) {
      result = result.replace(pattern, replacement as any);
    }

    return result;
  }

  /**
   * L1 → L2: Generate JSDoc @thread from log prefixes
   */
  private addJSDocThreadAnnotations(content: string): string {
    // Find functions and add @thread JSDoc based on their logs
    const functionRegex = /(\/\*\*[\s\S]*?\*\/\s*)?(async\s+)?function\s+(\w+)/g;

    return content.replace(functionRegex, (match, existingDoc, async, funcName) => {
      // Extract thread from function body
      const thread = this.extractThreadFromFunction(content, funcName);

      if (!thread) return match;

      // Check if JSDoc already exists
      if (existingDoc && existingDoc.includes('@thread')) {
        return match; // Already has @thread
      }

      // Add or update JSDoc
      if (existingDoc) {
        // Insert @thread before closing */
        const updatedDoc = existingDoc.replace(/\*\/$/, ` * @thread ${thread}\n */`);
        return `${updatedDoc}${async || ''}function ${funcName}`;
      } else {
        // Create new JSDoc
        const newDoc = `/**\n * @thread ${thread}\n */\n`;
        return `${newDoc}${async || ''}function ${funcName}`;
      }
    });
  }

  /**
   * L2 → L3: Wrap functions in ThreadContext
   */
  private wrapInThreadContext(content: string): string {
    // This is a simplified version - full implementation would need AST parsing
    // For now, add ThreadContext import and wrap basic patterns
    let result = content;

    // Add import if not present
    if (!result.includes('ThreadContext')) {
      result = `import { ThreadContext } from '@agent-brain/core/threading';\n\n${result}`;
    }

    // Transform patterns (simplified)
    // Real implementation would use TypeScript AST
    return result;
  }

  /**
   * L3 → L4: Add @ThreadSpec decorators
   */
  private addThreadSpecDecorators(content: string): string {
    // Add decorator import
    let result = content;

    if (!result.includes('@ThreadSpec')) {
      result = `import { ThreadSpec } from '@agent-brain/core/threading';\n\n${result}`;
    }

    // Find functions wrapped in ThreadContext and convert to decorators
    // Simplified implementation
    return result;
  }

  /**
   * Remove @ThreadSpec decorators
   */
  private removeThreadSpecDecorators(content: string): string {
    // Remove @ThreadSpec(...) decorators
    return content.replace(/@ThreadSpec\({[\s\S]*?}\)\n/g, '');
  }

  /**
   * Unwrap ThreadContext.run() calls
   */
  private unwrapThreadContext(content: string): string {
    // Simplified: Remove ThreadContext.run() wrappers
    // Real implementation needs proper AST parsing
    return content;
  }

  /**
   * Remove JSDoc @thread annotations
   */
  private removeJSDocThreadAnnotations(content: string): string {
    // Remove @thread lines from JSDoc
    return content.replace(/\s*\*\s*@thread\s+\w+\n/g, '');
  }

  /**
   * Remove [THREAD:X] prefixes
   */
  private removeThreadPrefixes(content: string): string {
    // Remove [THREAD:X] from log messages
    return content.replace(/\[THREAD:\w+\]\s*/g, '');
  }

  /**
   * Infer thread name from message content
   */
  private inferThreadFromMessage(message: string): string {
    const keywords = {
      'DATA_FLOW': ['fetch', 'load', 'get', 'retrieve', 'query'],
      'CACHE': ['cache', 'cached', 'hit', 'miss'],
      'VALIDATION': ['validat', 'check', 'verify'],
      'ERROR_RECOVERY': ['error', 'retry', 'recover', 'fail'],
      'AUTH': ['auth', 'login', 'permission', 'access']
    };

    const lowerMsg = message.toLowerCase();

    for (const [thread, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMsg.includes(word))) {
        return thread;
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Extract thread from function body
   */
  private extractThreadFromFunction(content: string, funcName: string): string | null {
    // Find function body
    const funcRegex = new RegExp(`function\\s+${funcName}[^{]*\\{([\\s\\S]*?)\\}`, 'm');
    const match = content.match(funcRegex);

    if (!match) return null;

    const body = match[1];

    // Extract [THREAD:X] from logs
    const threadMatch = body.match(/\[THREAD:(\w+)\]/);
    return threadMatch ? threadMatch[1] : null;
  }

  /**
   * Create backup of files before migration
   */
  private async createBackup(): Promise<string> {
    const timestamp = Date.now();
    const backupDir = path.join(this.config.workspacePath, '.threading', 'backups', `backup-${timestamp}`);

    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true });

    // Copy files to backup
    const files = await this.getFilesToMigrate();

    for (const filePath of files) {
      const relativePath = this.relativePath(filePath);
      const backupPath = path.join(backupDir, relativePath);

      // Ensure backup directory exists
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });

      // Copy file
      fs.copyFileSync(filePath, backupPath);
    }

    return backupDir;
  }

  /**
   * Get backup file mappings
   */
  private getBackupFiles(backupDir: string): Array<{ original: string; backup: string }> {
    const files: Array<{ original: string; backup: string }> = [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          const relativePath = path.relative(backupDir, fullPath);
          const originalPath = path.join(this.config.workspacePath, relativePath);

          files.push({
            original: originalPath,
            backup: fullPath
          });
        }
      }
    };

    walk(backupDir);
    return files;
  }

  /**
   * Get files to migrate
   */
  private async getFilesToMigrate(): Promise<string[]> {
    if (this.config.targetFiles) {
      return this.config.targetFiles.map(f => path.join(this.config.workspacePath, f));
    }

    // Find all TypeScript/JavaScript files
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and .git
        if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          walk(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    const srcDir = path.join(this.config.workspacePath, 'src');
    if (fs.existsSync(srcDir)) {
      walk(srcDir);
    }

    return files;
  }

  /**
   * Validate migration completed successfully
   */
  private async validateMigration(): Promise<string[]> {
    const errors: string[] = [];

    // TODO: Add validation logic
    // - Check syntax validity
    // - Check thread name consistency
    // - Check no broken references

    return errors;
  }

  /**
   * Generate migration summary
   */
  private generateSummary(result: MigrationResult): string {
    if (!result.success) {
      return `Migration failed: ${result.errors.length} errors`;
    }

    if (result.filesModified.length === 0) {
      return 'No files needed migration';
    }

    return `Successfully migrated ${result.filesModified.length} file(s) from L${result.fromLevel} to L${result.toLevel}`;
  }

  /**
   * Get relative path from workspace
   */
  private relativePath(filePath: string): string {
    return path.relative(this.config.workspacePath, filePath);
  }
}
