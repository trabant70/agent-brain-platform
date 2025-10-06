/**
 * ADR System
 * Management system for Architectural Decision Records
 */

import { ADR, ADRStatus, ADRMetrics } from './types';
import { ADRStorage, FileADRStorage } from './ADRStorage';

/**
 * Configuration for ADR System
 */
export interface ADRSystemConfig {
  storage?: ADRStorage;
}

/**
 * ADR System
 * Provides high-level operations for managing ADRs
 */
export class ADRSystem {
  private storage: ADRStorage;

  constructor(config: ADRSystemConfig = {}) {
    this.storage = config.storage || new FileADRStorage('.agent-brain/adrs.json');
  }

  /**
   * Create a new ADR
   * Automatically assigns sequential ID and number
   */
  async createADR(input: Omit<ADR, 'id' | 'number' | 'timestamp'>): Promise<ADR> {
    // Get next ADR number
    const existing = await this.storage.getAll();
    const number = existing.length + 1;
    const id = `adr-${String(number).padStart(3, '0')}`;

    const adr: ADR = {
      id,
      number,
      timestamp: new Date(),
      ...input
    };

    await this.storage.store(adr);
    console.log(`✅ Created ADR-${String(number).padStart(3, '0')}: ${adr.title}`);
    return adr;
  }

  /**
   * Get all ADRs
   */
  async getADRs(): Promise<ADR[]> {
    return this.storage.getAll();
  }

  /**
   * Get ADR by ID
   */
  async getADRById(id: string): Promise<ADR | null> {
    return this.storage.getById(id);
  }

  /**
   * Update an existing ADR
   */
  async updateADR(id: string, updates: Partial<ADR>): Promise<void> {
    await this.storage.update(id, updates);
  }

  /**
   * Supersede an ADR with a new one
   * Marks the old ADR as superseded and creates a new one
   */
  async supersede(
    oldId: string,
    newADR: Omit<ADR, 'id' | 'number' | 'timestamp'>
  ): Promise<ADR> {
    // Mark old ADR as superseded
    await this.storage.update(oldId, {
      status: ADRStatus.SUPERSEDED
    });

    // Create new ADR
    const created = await this.createADR({
      ...newADR,
      supersedes: oldId
    });

    // Update old ADR with reference to new one
    await this.storage.update(oldId, {
      supersededBy: created.id
    });

    console.log(`🔄 ADR ${oldId} superseded by ${created.id}`);
    return created;
  }

  /**
   * Deprecate an ADR
   */
  async deprecate(id: string): Promise<void> {
    await this.storage.update(id, {
      status: ADRStatus.DEPRECATED
    });
    console.log(`⚠️ ADR ${id} marked as deprecated`);
  }

  /**
   * Get metrics about ADRs
   */
  async getMetrics(): Promise<ADRMetrics> {
    return this.storage.getMetrics();
  }

  /**
   * Delete an ADR
   * Use with caution - prefer deprecating instead
   */
  async deleteADR(id: string): Promise<void> {
    await this.storage.delete(id);
  }
}
