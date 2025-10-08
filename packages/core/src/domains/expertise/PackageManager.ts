/**
 * Package Manager
 *
 * Manages loading, validation, and storage of expertise packages
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ExpertisePackage,
  ValidationResult
} from './types';

export class PackageManager {
  private packages: Map<string, ExpertisePackage> = new Map();
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = path.join(storagePath, 'packages');
    this.ensureStorageExists();
  }

  /**
   * Load package from JSON file
   */
  async loadPackageFromJSON(filePath: string): Promise<ExpertisePackage> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const pkg = JSON.parse(content) as ExpertisePackage;

    // Validate package structure
    const validation = this.validatePackage(pkg);
    if (!validation.valid) {
      throw new Error(`Invalid package: ${validation.errors.join(', ')}`);
    }

    // Store in memory
    this.packages.set(pkg.id, pkg);

    // Persist to storage
    await this.savePackage(pkg);

    return pkg;
  }

  /**
   * Load package from URL
   */
  async loadPackageFromURL(url: string): Promise<ExpertisePackage> {
    // For now, stub - will implement HTTP fetch later
    throw new Error('URL loading not yet implemented');
  }

  /**
   * Load package from object
   */
  async loadPackage(pkg: ExpertisePackage): Promise<void> {
    const validation = this.validatePackage(pkg);
    if (!validation.valid) {
      throw new Error(`Invalid package: ${validation.errors.join(', ')}`);
    }

    this.packages.set(pkg.id, pkg);
    await this.savePackage(pkg);
  }

  /**
   * Validate package structure
   */
  validatePackage(pkg: ExpertisePackage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!pkg.id) errors.push('Missing package id');
    if (!pkg.name) errors.push('Missing package name');
    if (!pkg.version) errors.push('Missing package version');
    if (!pkg.authority) errors.push('Missing authority level');
    if (!pkg.enforcement) errors.push('Missing enforcement level');

    // Validate authority
    const validAuthority = ['organizational', 'domain-expert', 'vendor-spec', 'community'];
    if (pkg.authority && !validAuthority.includes(pkg.authority)) {
      errors.push(`Invalid authority: ${pkg.authority}`);
    }

    // Validate enforcement
    const validEnforcement = ['mandatory', 'recommended', 'optional'];
    if (pkg.enforcement && !validEnforcement.includes(pkg.enforcement)) {
      errors.push(`Invalid enforcement: ${pkg.enforcement}`);
    }

    // Validate arrays exist
    if (!pkg.rules) pkg.rules = [];
    if (!pkg.patterns) pkg.patterns = [];
    if (!pkg.planningTemplates) pkg.planningTemplates = [];
    if (!pkg.validationCriteria) pkg.validationCriteria = [];
    if (!pkg.examples) pkg.examples = [];

    // Validate rules
    for (const rule of pkg.rules) {
      if (!rule.id) errors.push(`Rule missing id: ${rule.name}`);
      if (!rule.name) errors.push(`Rule missing name`);
      if (!rule.severity) errors.push(`Rule ${rule.id} missing severity`);
      if (!rule.condition) errors.push(`Rule ${rule.id} missing condition`);
      if (!rule.requirement) warnings.push(`Rule ${rule.id} missing requirement`);
    }

    // Validate patterns
    for (const pattern of pkg.patterns) {
      if (!pattern.id) errors.push(`Pattern missing id: ${pattern.name}`);
      if (!pattern.template) warnings.push(`Pattern ${pattern.id} missing template`);
    }

    // Validate planning templates
    for (const template of pkg.planningTemplates) {
      if (!template.id) errors.push(`Template missing id: ${template.name}`);
      if (!template.sections || template.sections.length === 0) {
        warnings.push(`Template ${template.id} has no sections`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get all loaded packages
   */
  getAllPackages(): ExpertisePackage[] {
    return Array.from(this.packages.values());
  }

  /**
   * Get package by ID
   */
  getPackageById(id: string): ExpertisePackage | null {
    return this.packages.get(id) || null;
  }

  /**
   * Save package to storage
   */
  async savePackage(pkg: ExpertisePackage): Promise<void> {
    const filename = `${this.sanitizeId(pkg.id)}.json`;
    const filepath = path.join(this.storagePath, filename);

    const content = JSON.stringify(pkg, null, 2);
    await fs.promises.writeFile(filepath, content, 'utf8');
  }

  /**
   * Load all packages from storage
   */
  async loadAllPackages(): Promise<void> {
    if (!fs.existsSync(this.storagePath)) {
      return;
    }

    const files = await fs.promises.readdir(this.storagePath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
      try {
        const filepath = path.join(this.storagePath, file);
        await this.loadPackageFromJSON(filepath);
      } catch (error) {
        console.error(`Failed to load package ${file}:`, error);
      }
    }
  }

  /**
   * Delete package
   */
  async deletePackage(packageId: string): Promise<void> {
    this.packages.delete(packageId);

    const filename = `${this.sanitizeId(packageId)}.json`;
    const filepath = path.join(this.storagePath, filename);

    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageExists(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Sanitize package ID for filename
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  /**
   * Get package count
   */
  getPackageCount(): number {
    return this.packages.size;
  }

  /**
   * Check if package exists
   */
  hasPackage(packageId: string): boolean {
    return this.packages.has(packageId);
  }
}
