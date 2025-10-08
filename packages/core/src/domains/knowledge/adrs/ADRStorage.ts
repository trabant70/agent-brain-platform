/**
 * ADR Storage
 * File-based persistence for Architectural Decision Records
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ADR, ADRStatus, ADRMetrics } from './types';

/**
 * Storage interface for ADRs
 */
export interface ADRStorage {
  store(adr: ADR): Promise<void>;
  getAll(): Promise<ADR[]>;
  getById(id: string): Promise<ADR | null>;
  update(id: string, updates: Partial<ADR>): Promise<void>;
  delete(id: string): Promise<void>;
  getMetrics(): Promise<ADRMetrics>;
}

/**
 * File-based ADR storage
 * Stores ADRs in JSON format
 */
export class FileADRStorage implements ADRStorage {
  private adrs: Map<string, ADR> = new Map();

  constructor(private filePath: string) {
    this.loadFromFile();
  }

  async store(adr: ADR): Promise<void> {
    this.adrs.set(adr.id, adr);
    await this.saveToFile();
  }

  async getAll(): Promise<ADR[]> {
    return Array.from(this.adrs.values())
      .sort((a, b) => b.number - a.number); // Most recent first
  }

  async getById(id: string): Promise<ADR | null> {
    return this.adrs.get(id) || null;
  }

  async update(id: string, updates: Partial<ADR>): Promise<void> {
    const existing = this.adrs.get(id);
    if (existing) {
      this.adrs.set(id, { ...existing, ...updates });
      await this.saveToFile();
    }
  }

  async delete(id: string): Promise<void> {
    this.adrs.delete(id);
    await this.saveToFile();
  }

  async getMetrics(): Promise<ADRMetrics> {
    const adrs = await this.getAll();

    const byStatus: Record<ADRStatus, number> = {
      [ADRStatus.PROPOSED]: 0,
      [ADRStatus.ACCEPTED]: 0,
      [ADRStatus.DEPRECATED]: 0,
      [ADRStatus.SUPERSEDED]: 0
    };

    const byTag: Record<string, number> = {};

    adrs.forEach(adr => {
      byStatus[adr.status]++;
      adr.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
    });

    return {
      total: adrs.length,
      byStatus,
      byTag,
      recentADRs: adrs.slice(0, 10)
    };
  }

  /**
   * Load ADRs from file
   */
  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const adrs = JSON.parse(data) as ADR[];

      this.adrs.clear();
      adrs.forEach(adr => {
        // Convert date strings back to Date objects
        adr.timestamp = new Date(adr.timestamp);
        this.adrs.set(adr.id, adr);
      });

    } catch (error) {
    }
  }

  /**
   * Save ADRs to file
   */
  private async saveToFile(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      const adrs = Array.from(this.adrs.values());
      await fs.writeFile(this.filePath, JSON.stringify(adrs, null, 2));
    } catch (error) {
      throw error;
    }
  }
}
