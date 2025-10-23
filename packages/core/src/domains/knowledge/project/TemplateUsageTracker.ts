/**
 * TemplateUsageTracker
 *
 * Tracks which files use which templates for re-injection prompts.
 * When a template is updated, this tracker helps identify all locations
 * where the template has been previously injected.
 *
 * Storage: .agent-brain/template-usage.json
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TemplateUsage {
  templateId: string;
  usedIn: string[];  // File paths where template is injected
  lastApplied: string;  // ISO timestamp
}

export interface UsageRecord {
  [templateId: string]: {
    usedIn: string[];
    lastApplied: string;
  };
}

/**
 * Tracks template usage across the project
 */
export class TemplateUsageTracker {
  private usageFilePath: string;
  private usage: UsageRecord = {};

  constructor(knowledgeBaseDir: string) {
    this.usageFilePath = path.join(knowledgeBaseDir, 'template-usage.json');
  }

  // ============================================
  // Lifecycle Management
  // ============================================

  /**
   * Load usage data from disk
   */
  async load(): Promise<void> {
    try {
      if (fs.existsSync(this.usageFilePath)) {
        const content = fs.readFileSync(this.usageFilePath, 'utf8');
        this.usage = JSON.parse(content);
      } else {
        this.usage = {};
      }
    } catch (error: any) {
      console.error(`Failed to load template usage: ${error.message}`);
      this.usage = {};
    }
  }

  /**
   * Save usage data to disk
   */
  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.usageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.usageFilePath,
        JSON.stringify(this.usage, null, 2),
        'utf8'
      );
    } catch (error: any) {
      console.error(`Failed to save template usage: ${error.message}`);
    }
  }

  // ============================================
  // Usage Tracking
  // ============================================

  /**
   * Record that a template was applied to a file
   */
  async trackUsage(templateId: string, filePath: string): Promise<void> {
    if (!this.usage[templateId]) {
      this.usage[templateId] = {
        usedIn: [],
        lastApplied: new Date().toISOString()
      };
    }

    // Add file path if not already tracked
    if (!this.usage[templateId].usedIn.includes(filePath)) {
      this.usage[templateId].usedIn.push(filePath);
    }

    // Update timestamp
    this.usage[templateId].lastApplied = new Date().toISOString();

    await this.save();
  }

  /**
   * Remove a file from template usage tracking
   * Called when template is removed from a file
   */
  async untrackUsage(templateId: string, filePath: string): Promise<void> {
    if (!this.usage[templateId]) {
      return;
    }

    const index = this.usage[templateId].usedIn.indexOf(filePath);
    if (index !== -1) {
      this.usage[templateId].usedIn.splice(index, 1);

      // If no more files use this template, remove the record
      if (this.usage[templateId].usedIn.length === 0) {
        delete this.usage[templateId];
      } else {
        // Update timestamp
        this.usage[templateId].lastApplied = new Date().toISOString();
      }

      await this.save();
    }
  }

  /**
   * Get all files where a template is used
   */
  getUsageLocations(templateId: string): string[] {
    return this.usage[templateId]?.usedIn || [];
  }

  /**
   * Get usage information for a template
   */
  getUsage(templateId: string): TemplateUsage | undefined {
    const record = this.usage[templateId];
    if (!record) {
      return undefined;
    }

    return {
      templateId,
      usedIn: [...record.usedIn],
      lastApplied: record.lastApplied
    };
  }

  /**
   * Check if a template is used in any files
   */
  isTemplateUsed(templateId: string): boolean {
    const locations = this.getUsageLocations(templateId);
    return locations.length > 0;
  }

  /**
   * Get all templates with their usage
   */
  getAllUsage(): TemplateUsage[] {
    return Object.keys(this.usage).map(templateId => ({
      templateId,
      usedIn: [...this.usage[templateId].usedIn],
      lastApplied: this.usage[templateId].lastApplied
    }));
  }

  /**
   * Clear all usage tracking for a template
   * Called when template is deleted
   */
  async clearTemplateUsage(templateId: string): Promise<void> {
    delete this.usage[templateId];
    await this.save();
  }

  /**
   * Clear usage tracking for a specific file across all templates
   * Called when a file is deleted
   */
  async clearFileUsage(filePath: string): Promise<void> {
    let changed = false;

    for (const templateId of Object.keys(this.usage)) {
      const index = this.usage[templateId].usedIn.indexOf(filePath);
      if (index !== -1) {
        this.usage[templateId].usedIn.splice(index, 1);
        changed = true;

        // Remove template record if no more files
        if (this.usage[templateId].usedIn.length === 0) {
          delete this.usage[templateId];
        }
      }
    }

    if (changed) {
      await this.save();
    }
  }

  // ============================================
  // Re-injection Support
  // ============================================

  /**
   * Check if template update should prompt for re-injection
   * Returns list of files where template is currently used
   */
  shouldPromptReinjection(templateId: string): { shouldPrompt: boolean; files: string[] } {
    const files = this.getUsageLocations(templateId);
    return {
      shouldPrompt: files.length > 0,
      files
    };
  }

  /**
   * Get statistics about template usage
   */
  getStats(): {
    totalTemplatesTracked: number;
    totalFilesAffected: number;
    templatesWithUsage: number;
  } {
    const allFiles = new Set<string>();
    let templatesWithUsage = 0;

    for (const record of Object.values(this.usage)) {
      if (record.usedIn.length > 0) {
        templatesWithUsage++;
        record.usedIn.forEach(file => allFiles.add(file));
      }
    }

    return {
      totalTemplatesTracked: Object.keys(this.usage).length,
      totalFilesAffected: allFiles.size,
      templatesWithUsage
    };
  }

  /**
   * Validate usage records by checking if files still exist
   * Returns list of invalid file paths that were removed
   */
  async validateAndClean(): Promise<string[]> {
    const removedFiles: string[] = [];
    let changed = false;

    for (const templateId of Object.keys(this.usage)) {
      const record = this.usage[templateId];
      const validFiles: string[] = [];

      for (const filePath of record.usedIn) {
        if (fs.existsSync(filePath)) {
          validFiles.push(filePath);
        } else {
          removedFiles.push(filePath);
          changed = true;
        }
      }

      if (validFiles.length === 0) {
        // No valid files left, remove template record
        delete this.usage[templateId];
      } else if (validFiles.length !== record.usedIn.length) {
        // Some files removed, update record
        this.usage[templateId].usedIn = validFiles;
      }
    }

    if (changed) {
      await this.save();
    }

    return removedFiles;
  }
}
