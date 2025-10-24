/**
 * Version Manager
 *
 * Manages user-created version checkpoints for templates.
 * Provides capabilities for:
 * - Creating version snapshots (deep copy)
 * - Restoring from a version
 * - Comparing versions (diff)
 * - Managing version history
 */

import {
  MarketplaceTemplate,
  TemplateVersion,
  AuditOperation
} from './types';
import { AuditLogger } from './AuditLogger';

/**
 * Options for creating a version checkpoint
 */
export interface CreateVersionOptions {
  versionNumber: string;
  description: string;
  createdBy: string;
}

/**
 * Result of version comparison
 */
export interface VersionDiff {
  versionA: string;
  versionB: string;
  itemsAdded: string[];      // Item IDs added in B
  itemsRemoved: string[];    // Item IDs removed from A
  itemsModified: string[];   // Item IDs modified
  metadataChanged: boolean;
  changes: {
    name?: { from: string; to: string };
    description?: { from: string; to: string };
    tags?: { from: string[]; to: string[] };
  };
}

/**
 * Result of restore operation
 */
export interface RestoreResult {
  success: boolean;
  restoredVersion: string;
  error?: string;
}

/**
 * VersionManager - Manages template version checkpoints
 */
export class VersionManager {
  private auditLogger: AuditLogger;

  constructor(auditLogger?: AuditLogger) {
    this.auditLogger = auditLogger || new AuditLogger();
  }

  /**
   * Create a version checkpoint (deep snapshot)
   */
  createVersion(
    template: MarketplaceTemplate,
    options: CreateVersionOptions
  ): TemplateVersion {
    // Create deep snapshot of current state
    const snapshot = {
      items: template.items.map(item => ({
        ...item,
        metadata: { ...item.metadata },
        tags: [...item.tags],
        injectedTo: item.injectedTo ? [...item.injectedTo] : []
      })),
      templateMetadata: {
        name: template.name,
        description: template.description,
        tags: [...template.tags],
        category: template.category
      }
    };

    const version: TemplateVersion = {
      versionNumber: options.versionNumber,
      description: options.description,
      createdAt: new Date(),
      createdBy: options.createdBy,
      itemCount: template.items.length,
      snapshot
    };

    // Add to template's version history
    template.versionHistory = template.versionHistory || [];
    template.versionHistory.push(version);

    // Update template version and timestamp
    template.version = options.versionNumber;
    template.lastVersionedAt = new Date().toISOString();
    template.updatedAt = new Date().toISOString();

    // Add audit log entry
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.TEMPLATE_VERSIONED,
      actor: options.createdBy,
      details: {
        comment: options.description,
        context: `Version ${options.versionNumber} created with ${template.items.length} items`
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return version;
  }

  /**
   * Get a specific version from history
   */
  getVersion(
    template: MarketplaceTemplate,
    versionNumber: string
  ): TemplateVersion | null {
    if (!template.versionHistory) {
      return null;
    }

    return template.versionHistory.find(
      v => v.versionNumber === versionNumber
    ) || null;
  }

  /**
   * Get all versions for a template
   */
  getAllVersions(template: MarketplaceTemplate): TemplateVersion[] {
    return template.versionHistory || [];
  }

  /**
   * Get the latest version
   */
  getLatestVersion(template: MarketplaceTemplate): TemplateVersion | null {
    if (!template.versionHistory || template.versionHistory.length === 0) {
      return null;
    }

    return template.versionHistory[template.versionHistory.length - 1];
  }

  /**
   * Restore template to a specific version
   */
  restoreToVersion(
    template: MarketplaceTemplate,
    versionNumber: string,
    actor: string = 'user'
  ): RestoreResult {
    const version = this.getVersion(template, versionNumber);
    if (!version) {
      return {
        success: false,
        restoredVersion: versionNumber,
        error: `Version ${versionNumber} not found`
      };
    }

    // Store current state before restoring (for audit)
    const beforeState = {
      itemCount: template.items.length,
      name: template.name,
      description: template.description,
      tags: [...template.tags]
    };

    // Restore items (deep copy from snapshot)
    template.items = version.snapshot.items.map(item => ({
      ...item,
      metadata: { ...item.metadata },
      tags: [...item.tags],
      injectedTo: item.injectedTo ? [...item.injectedTo] : []
    }));

    template.itemCount = template.items.length;

    // Restore metadata
    template.name = version.snapshot.templateMetadata.name;
    template.description = version.snapshot.templateMetadata.description;
    template.tags = [...version.snapshot.templateMetadata.tags];
    template.category = version.snapshot.templateMetadata.category;

    template.updatedAt = new Date().toISOString();

    // Add audit log entry
    const auditEntry = this.auditLogger.createEntry({
      operation: AuditOperation.TEMPLATE_RESTORED,
      actor,
      details: {
        comment: `Restored to version ${versionNumber}`,
        context: `${beforeState.itemCount} items → ${template.items.length} items`
      },
      before: beforeState,
      after: {
        itemCount: template.items.length,
        name: template.name,
        description: template.description,
        tags: template.tags
      }
    });

    template.auditLog = template.auditLog || [];
    template.auditLog.push(auditEntry);

    return {
      success: true,
      restoredVersion: versionNumber
    };
  }

  /**
   * Compare two versions and return the differences
   */
  compareVersions(
    template: MarketplaceTemplate,
    versionNumberA: string,
    versionNumberB: string
  ): VersionDiff | null {
    const versionA = this.getVersion(template, versionNumberA);
    const versionB = this.getVersion(template, versionNumberB);

    if (!versionA || !versionB) {
      return null;
    }

    const itemsA = new Map(versionA.snapshot.items.map(item => [item.id, item]));
    const itemsB = new Map(versionB.snapshot.items.map(item => [item.id, item]));

    const itemsAdded: string[] = [];
    const itemsRemoved: string[] = [];
    const itemsModified: string[] = [];

    // Find added and modified items
    for (const [id, itemB] of itemsB) {
      const itemA = itemsA.get(id);
      if (!itemA) {
        itemsAdded.push(id);
      } else if (this.itemsAreDifferent(itemA, itemB)) {
        itemsModified.push(id);
      }
    }

    // Find removed items
    for (const id of itemsA.keys()) {
      if (!itemsB.has(id)) {
        itemsRemoved.push(id);
      }
    }

    // Compare metadata
    const metaA = versionA.snapshot.templateMetadata;
    const metaB = versionB.snapshot.templateMetadata;

    const changes: VersionDiff['changes'] = {};
    let metadataChanged = false;

    if (metaA.name !== metaB.name) {
      changes.name = { from: metaA.name, to: metaB.name };
      metadataChanged = true;
    }

    if (metaA.description !== metaB.description) {
      changes.description = { from: metaA.description, to: metaB.description };
      metadataChanged = true;
    }

    if (JSON.stringify(metaA.tags) !== JSON.stringify(metaB.tags)) {
      changes.tags = { from: metaA.tags, to: metaB.tags };
      metadataChanged = true;
    }

    return {
      versionA: versionNumberA,
      versionB: versionNumberB,
      itemsAdded,
      itemsRemoved,
      itemsModified,
      metadataChanged,
      changes
    };
  }

  /**
   * Delete a version from history
   */
  deleteVersion(
    template: MarketplaceTemplate,
    versionNumber: string,
    actor: string = 'user'
  ): boolean {
    if (!template.versionHistory) {
      return false;
    }

    const index = template.versionHistory.findIndex(
      v => v.versionNumber === versionNumber
    );

    if (index === -1) {
      return false;
    }

    template.versionHistory.splice(index, 1);
    template.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Get version statistics
   */
  getVersionStatistics(template: MarketplaceTemplate): VersionStatistics {
    const versions = template.versionHistory || [];

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        oldestVersion: null,
        newestVersion: null,
        averageItemCount: 0
      };
    }

    const sortedVersions = [...versions].sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    const totalItems = versions.reduce((sum, v) => sum + v.itemCount, 0);
    const averageItemCount = totalItems / versions.length;

    return {
      totalVersions: versions.length,
      oldestVersion: sortedVersions[0],
      newestVersion: sortedVersions[sortedVersions.length - 1],
      averageItemCount: Math.round(averageItemCount)
    };
  }

  /**
   * Export version history to JSON
   */
  exportVersionHistory(template: MarketplaceTemplate): string {
    return JSON.stringify(
      {
        templateId: template.id,
        templateName: template.name,
        currentVersion: template.version,
        exportedAt: new Date().toISOString(),
        versionHistory: template.versionHistory || []
      },
      null,
      2
    );
  }

  /**
   * Suggest next version number based on semantic versioning
   */
  suggestNextVersion(
    template: MarketplaceTemplate,
    changeType: 'major' | 'minor' | 'patch' = 'minor'
  ): string {
    const current = template.version;
    const parts = current.split('.').map(Number);

    if (parts.length !== 3 || parts.some(isNaN)) {
      // If current version is not semver, suggest 1.0.0
      return '1.0.0';
    }

    let [major, minor, patch] = parts;

    switch (changeType) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
      case 'patch':
        patch += 1;
        break;
    }

    return `${major}.${minor}.${patch}`;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Check if two items are different (for comparison)
   */
  private itemsAreDifferent(itemA: any, itemB: any): boolean {
    return (
      itemA.title !== itemB.title ||
      itemA.body !== itemB.body ||
      itemA.type !== itemB.type ||
      itemA.scope !== itemB.scope ||
      JSON.stringify(itemA.tags) !== JSON.stringify(itemB.tags)
    );
  }
}

/**
 * Version statistics
 */
export interface VersionStatistics {
  totalVersions: number;
  oldestVersion: TemplateVersion | null;
  newestVersion: TemplateVersion | null;
  averageItemCount: number;
}
