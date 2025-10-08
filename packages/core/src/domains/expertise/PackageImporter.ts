/**
 * Package Importer
 *
 * Imports expertise packages from various sources:
 * - Local files (JSON or markdown)
 * - URLs (HTTP/HTTPS)
 * - Registry (stub for future marketplace)
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ExpertisePackage,
  ValidationResult
} from './types';
import { PackageManager } from './PackageManager';
import { MarkdownConverter } from './MarkdownConverter';
import { ConflictResolver, type Conflict } from './ConflictResolver';

/**
 * Import options
 */
export interface ImportOptions {
  /** Validate package before importing */
  validate?: boolean;

  /** Check for conflicts with existing packages */
  checkConflicts?: boolean;

  /** Auto-resolve conflicts (uses authority hierarchy) */
  autoResolve?: boolean;

  /** Callback for progress updates */
  onProgress?: (message: string) => void;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Successfully imported package */
  package: ExpertisePackage;

  /** Validation result (if validation enabled) */
  validation?: ValidationResult;

  /** Detected conflicts (if conflict checking enabled) */
  conflicts?: Conflict[];

  /** Whether conflicts were auto-resolved */
  conflictsResolved?: boolean;

  /** Import duration (ms) */
  duration: number;
}

/**
 * Package Importer
 * Handles importing packages from various sources
 */
export class PackageImporter {
  private packageManager: PackageManager;
  private markdownConverter: MarkdownConverter;
  private conflictResolver: ConflictResolver;

  constructor(packageManager: PackageManager) {
    this.packageManager = packageManager;
    this.markdownConverter = new MarkdownConverter();
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Import package from JSON file
   */
  async importFromFile(
    filePath: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const { validate = true, checkConflicts = true, onProgress } = options;

    onProgress?.(`Importing package from ${filePath}...`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Determine file type
    const ext = path.extname(filePath).toLowerCase();

    let pkg: ExpertisePackage;

    if (ext === '.json') {
      // Import JSON package
      onProgress?.('Parsing JSON package...');
      pkg = await this.importJSONFile(filePath);
    } else if (ext === '.md') {
      // Import markdown file
      onProgress?.('Converting markdown to package...');
      pkg = await this.importMarkdownFile(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}. Supported: .json, .md`);
    }

    // Validate if requested
    let validation: ValidationResult | undefined;
    if (validate) {
      onProgress?.('Validating package...');
      validation = this.packageManager.validatePackage(pkg);
      if (!validation.valid) {
        throw new Error(`Package validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Check conflicts if requested
    let conflicts: Conflict[] | undefined;
    let conflictsResolved = false;
    if (checkConflicts) {
      onProgress?.('Checking for conflicts...');
      const existingPackages = this.packageManager.getAllPackages();
      conflicts = this.detectConflicts(pkg, existingPackages);

      if (conflicts.length > 0 && options.autoResolve) {
        onProgress?.(`Resolving ${conflicts.length} conflicts...`);
        conflictsResolved = true;
        // Auto-resolve is handled by PackageHierarchy when packages are merged
      }
    }

    // Load package
    onProgress?.('Loading package into system...');
    await this.packageManager.loadPackage(pkg);

    const duration = Date.now() - startTime;
    onProgress?.(`Package imported successfully in ${duration}ms`);

    return {
      package: pkg,
      validation,
      conflicts,
      conflictsResolved,
      duration
    };
  }

  /**
   * Import package from URL (stub for future HTTP support)
   */
  async importFromURL(
    url: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { onProgress } = options;

    onProgress?.(`Importing package from ${url}...`);

    // TODO: Implement HTTP fetch
    // For now, throw error indicating this is not yet implemented
    throw new Error('URL import not yet implemented. Coming in future release.');

    /* Future implementation:
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch package: ${response.statusText}`);
    }

    const content = await response.text();
    const pkg = JSON.parse(content) as ExpertisePackage;

    return this.importPackage(pkg, options);
    */
  }

  /**
   * Import package from registry (stub for future marketplace)
   */
  async importFromRegistry(
    packageId: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { onProgress } = options;

    onProgress?.(`Importing package ${packageId} from registry...`);

    // TODO: Implement registry client
    // For now, throw error indicating this is not yet implemented
    throw new Error('Registry import not yet implemented. Coming in future release with marketplace.');

    /* Future implementation:
    const registryUrl = `https://registry.agentbrain.dev/packages/${packageId}`;
    return this.importFromURL(registryUrl, options);
    */
  }

  /**
   * Import package object directly
   */
  async importPackage(
    pkg: ExpertisePackage,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const { validate = true, checkConflicts = true, onProgress } = options;

    // Validate if requested
    let validation: ValidationResult | undefined;
    if (validate) {
      onProgress?.('Validating package...');
      validation = this.packageManager.validatePackage(pkg);
      if (!validation.valid) {
        throw new Error(`Package validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Check conflicts if requested
    let conflicts: Conflict[] | undefined;
    let conflictsResolved = false;
    if (checkConflicts) {
      onProgress?.('Checking for conflicts...');
      const existingPackages = this.packageManager.getAllPackages();
      conflicts = this.detectConflicts(pkg, existingPackages);

      if (conflicts.length > 0 && options.autoResolve) {
        onProgress?.(`Resolving ${conflicts.length} conflicts...`);
        conflictsResolved = true;
      }
    }

    // Load package
    onProgress?.('Loading package into system...');
    await this.packageManager.loadPackage(pkg);

    const duration = Date.now() - startTime;

    return {
      package: pkg,
      validation,
      conflicts,
      conflictsResolved,
      duration
    };
  }

  /**
   * Import JSON file
   */
  private async importJSONFile(filePath: string): Promise<ExpertisePackage> {
    return await this.packageManager.loadPackageFromJSON(filePath);
  }

  /**
   * Import markdown file
   */
  private async importMarkdownFile(filePath: string): Promise<ExpertisePackage> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const filename = path.basename(filePath).toLowerCase();

    // Determine type based on filename
    if (filename.includes('adr')) {
      return this.markdownConverter.convertADRsToPackage(content);
    } else if (filename.includes('pattern')) {
      return this.markdownConverter.convertPatternsToPackage(content);
    } else if (filename.includes('golden') || filename.includes('path')) {
      return this.markdownConverter.convertGoldenPathsToPackage(content);
    } else if (filename.includes('planning') || filename.includes('template')) {
      return this.markdownConverter.convertPlanningTemplatesToPackage(content);
    } else {
      throw new Error(`Cannot determine package type from filename: ${filename}`);
    }
  }

  /**
   * Detect conflicts with existing packages
   */
  private detectConflicts(
    newPackage: ExpertisePackage,
    existingPackages: ExpertisePackage[]
  ): Conflict[] {
    // Add new package to list for conflict detection
    const allPackages = [...existingPackages, newPackage];
    return this.conflictResolver.detectConflicts(allPackages);
  }
}
