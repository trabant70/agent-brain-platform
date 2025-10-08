/**
 * ProjectProfileManager
 *
 * Tracks which knowledge items (ADRs, patterns, learnings) are enabled/disabled
 * per project. Allows users to customize which knowledge is included in prompts.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeItem {
  id: string;
  type: 'adr' | 'pattern' | 'learning' | 'golden-path';
  enabled: boolean;
  lastUsed?: Date;
  useCount: number;
}

export interface ProjectProfile {
  projectPath: string;
  knowledgeItems: Map<string, KnowledgeItem>;
  lastModified: Date;
}

interface SerializedProfile {
  projectPath: string;
  knowledgeItems: Array<[string, KnowledgeItem]>;
  lastModified: string;
}

export class ProjectProfileManager {
  private profiles: Map<string, ProjectProfile> = new Map();
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Get profile file path for a project
   */
  private getProfileFilePath(projectPath: string): string {
    const hash = this.hashProjectPath(projectPath);
    return path.join(this.storagePath, `profile-${hash}.json`);
  }

  /**
   * Hash project path to create unique filename
   */
  private hashProjectPath(projectPath: string): string {
    // Simple hash function - convert path to base64
    return Buffer.from(projectPath).toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
  }

  /**
   * Load profile for a project
   */
  async loadProfile(projectPath: string): Promise<ProjectProfile> {
    // Check memory cache first
    if (this.profiles.has(projectPath)) {
      return this.profiles.get(projectPath)!;
    }

    const filePath = this.getProfileFilePath(projectPath);

    // If file doesn't exist, create new profile
    if (!fs.existsSync(filePath)) {
      const newProfile: ProjectProfile = {
        projectPath,
        knowledgeItems: new Map(),
        lastModified: new Date()
      };
      this.profiles.set(projectPath, newProfile);
      return newProfile;
    }

    // Load from disk
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const serialized: SerializedProfile = JSON.parse(content);

      const profile: ProjectProfile = {
        projectPath: serialized.projectPath,
        knowledgeItems: new Map(serialized.knowledgeItems.map(([key, value]) => [
          key,
          {
            ...value,
            lastUsed: value.lastUsed ? new Date(value.lastUsed) : undefined
          }
        ])),
        lastModified: new Date(serialized.lastModified)
      };

      this.profiles.set(projectPath, profile);
      return profile;
    } catch (error) {
      // If parse fails, return new profile
      console.error(`Failed to load profile for ${projectPath}:`, error);
      const newProfile: ProjectProfile = {
        projectPath,
        knowledgeItems: new Map(),
        lastModified: new Date()
      };
      this.profiles.set(projectPath, newProfile);
      return newProfile;
    }
  }

  /**
   * Save profile for a project
   */
  async saveProfile(projectPath: string): Promise<void> {
    const profile = this.profiles.get(projectPath);
    if (!profile) {
      return; // Nothing to save
    }

    const filePath = this.getProfileFilePath(projectPath);

    const serialized: SerializedProfile = {
      projectPath: profile.projectPath,
      knowledgeItems: Array.from(profile.knowledgeItems.entries()),
      lastModified: profile.lastModified.toISOString()
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save profile for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Enable a knowledge item
   */
  async enableItem(projectPath: string, itemId: string, itemType: 'adr' | 'pattern' | 'learning' | 'golden-path'): Promise<void> {
    const profile = await this.loadProfile(projectPath);

    const existingItem = profile.knowledgeItems.get(itemId);
    if (existingItem) {
      existingItem.enabled = true;
    } else {
      profile.knowledgeItems.set(itemId, {
        id: itemId,
        type: itemType,
        enabled: true,
        useCount: 0
      });
    }

    profile.lastModified = new Date();
    await this.saveProfile(projectPath);
  }

  /**
   * Disable a knowledge item
   */
  async disableItem(projectPath: string, itemId: string): Promise<void> {
    const profile = await this.loadProfile(projectPath);

    const item = profile.knowledgeItems.get(itemId);
    if (item) {
      item.enabled = false;
      profile.lastModified = new Date();
      await this.saveProfile(projectPath);
    }
  }

  /**
   * Check if an item is enabled
   */
  async isItemEnabled(projectPath: string, itemId: string): Promise<boolean> {
    const profile = await this.loadProfile(projectPath);
    const item = profile.knowledgeItems.get(itemId);

    // Default to enabled if not explicitly set
    return item ? item.enabled : true;
  }

  /**
   * Record item usage
   */
  async recordItemUsage(projectPath: string, itemId: string): Promise<void> {
    const profile = await this.loadProfile(projectPath);

    const item = profile.knowledgeItems.get(itemId);
    if (item) {
      item.useCount++;
      item.lastUsed = new Date();
      profile.lastModified = new Date();
      await this.saveProfile(projectPath);
    }
  }

  /**
   * Get enabled items, optionally filtered by type
   */
  async getEnabledItems(projectPath: string, type?: 'adr' | 'pattern' | 'learning' | 'golden-path'): Promise<KnowledgeItem[]> {
    const profile = await this.loadProfile(projectPath);

    const items = Array.from(profile.knowledgeItems.values())
      .filter(item => item.enabled);

    if (type) {
      return items.filter(item => item.type === type);
    }

    return items;
  }

  /**
   * Get statistics for a project
   */
  async getStatistics(projectPath: string): Promise<{
    totalItems: number;
    enabledItems: number;
    disabledItems: number;
    recentlyUsed: KnowledgeItem[];
    neverUsed: KnowledgeItem[];
  }> {
    const profile = await this.loadProfile(projectPath);
    const items = Array.from(profile.knowledgeItems.values());

    const enabledItems = items.filter(item => item.enabled);
    const disabledItems = items.filter(item => !item.enabled);

    // Recently used: items used in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyUsed = items
      .filter(item => item.lastUsed && item.lastUsed > sevenDaysAgo)
      .sort((a, b) => {
        if (!a.lastUsed || !b.lastUsed) return 0;
        return b.lastUsed.getTime() - a.lastUsed.getTime();
      })
      .slice(0, 10); // Top 10

    const neverUsed = items.filter(item => item.useCount === 0);

    return {
      totalItems: items.length,
      enabledItems: enabledItems.length,
      disabledItems: disabledItems.length,
      recentlyUsed,
      neverUsed
    };
  }

  /**
   * Remove item from profile
   */
  async removeItem(projectPath: string, itemId: string): Promise<void> {
    const profile = await this.loadProfile(projectPath);
    profile.knowledgeItems.delete(itemId);
    profile.lastModified = new Date();
    await this.saveProfile(projectPath);
  }

  /**
   * Clear all items from profile
   */
  async clearProfile(projectPath: string): Promise<void> {
    const profile = await this.loadProfile(projectPath);
    profile.knowledgeItems.clear();
    profile.lastModified = new Date();
    await this.saveProfile(projectPath);
  }

  /**
   * Get all project paths with profiles
   */
  getAllProfiles(): string[] {
    return Array.from(this.profiles.keys());
  }
}
