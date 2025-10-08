/**
 * Package Exporter
 *
 * Exports expertise packages to various formats:
 * - JSON files (single package)
 * - JSON bundles (package with dependencies)
 * - Markdown format (for documentation)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ExpertisePackage } from './types';
import { PackageManager } from './PackageManager';

/**
 * Export options
 */
export interface ExportOptions {
  /** Pretty-print JSON (default: true) */
  prettyPrint?: boolean;

  /** Include dependencies (default: false) */
  includeDependencies?: boolean;

  /** Include metadata timestamp (default: true) */
  includeTimestamp?: boolean;

  /** Callback for progress updates */
  onProgress?: (message: string) => void;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Output file path */
  filePath: string;

  /** Number of packages exported */
  packagesExported: number;

  /** File size (bytes) */
  fileSize: number;

  /** Export duration (ms) */
  duration: number;
}

/**
 * Package Exporter
 * Handles exporting packages to files
 */
export class PackageExporter {
  private packageManager: PackageManager;

  constructor(packageManager: PackageManager) {
    this.packageManager = packageManager;
  }

  /**
   * Export single package to JSON file
   */
  async exportToFile(
    packageId: string,
    filePath: string,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const { prettyPrint = true, includeTimestamp = true, onProgress } = options;

    onProgress?.(`Exporting package ${packageId}...`);

    // Get package
    const pkg = this.packageManager.getPackageById(packageId);
    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`);
    }

    // Update timestamp if requested
    if (includeTimestamp) {
      pkg.metadata.updated = new Date().toISOString();
    }

    // Ensure output directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    onProgress?.('Writing JSON file...');
    const json = prettyPrint
      ? JSON.stringify(pkg, null, 2)
      : JSON.stringify(pkg);

    await fs.promises.writeFile(filePath, json, 'utf8');

    const stats = fs.statSync(filePath);
    const duration = Date.now() - startTime;

    onProgress?.(`Package exported successfully in ${duration}ms`);

    return {
      filePath,
      packagesExported: 1,
      fileSize: stats.size,
      duration
    };
  }

  /**
   * Export package with all its dependencies
   */
  async exportWithDependencies(
    packageId: string,
    outputPath: string,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const { prettyPrint = true, includeTimestamp = true, onProgress } = options;

    onProgress?.(`Exporting package ${packageId} with dependencies...`);

    // Get main package
    const mainPackage = this.packageManager.getPackageById(packageId);
    if (!mainPackage) {
      throw new Error(`Package not found: ${packageId}`);
    }

    // Collect all dependencies recursively
    const allPackages = this.collectDependencies(mainPackage);
    onProgress?.(`Found ${allPackages.length} packages (including dependencies)`);

    // Create bundle
    const bundle = {
      version: '1.0.0',
      exported: new Date().toISOString(),
      mainPackage: packageId,
      packages: allPackages.map(pkg => {
        if (includeTimestamp) {
          pkg.metadata.updated = new Date().toISOString();
        }
        return pkg;
      })
    };

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write bundle file
    onProgress?.('Writing bundle file...');
    const json = prettyPrint
      ? JSON.stringify(bundle, null, 2)
      : JSON.stringify(bundle);

    await fs.promises.writeFile(outputPath, json, 'utf8');

    const stats = fs.statSync(outputPath);
    const duration = Date.now() - startTime;

    onProgress?.(`Bundle exported successfully in ${duration}ms`);

    return {
      filePath: outputPath,
      packagesExported: allPackages.length,
      fileSize: stats.size,
      duration
    };
  }

  /**
   * Bundle multiple packages for sharing
   */
  async bundleForSharing(
    packageIds: string[],
    outputPath: string,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const { prettyPrint = true, includeTimestamp = true, includeDependencies = false, onProgress } = options;

    onProgress?.(`Bundling ${packageIds.length} packages for sharing...`);

    const allPackages: ExpertisePackage[] = [];

    // Collect all requested packages
    for (const packageId of packageIds) {
      const pkg = this.packageManager.getPackageById(packageId);
      if (!pkg) {
        throw new Error(`Package not found: ${packageId}`);
      }

      if (includeDependencies) {
        // Include dependencies
        const withDeps = this.collectDependencies(pkg);
        for (const dep of withDeps) {
          // Avoid duplicates
          if (!allPackages.find(p => p.id === dep.id)) {
            allPackages.push(dep);
          }
        }
      } else {
        allPackages.push(pkg);
      }
    }

    onProgress?.(`Collected ${allPackages.length} packages`);

    // Create bundle
    const bundle = {
      version: '1.0.0',
      exported: new Date().toISOString(),
      description: 'Package bundle for sharing',
      packages: allPackages.map(pkg => {
        if (includeTimestamp) {
          pkg.metadata.updated = new Date().toISOString();
        }
        return pkg;
      })
    };

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write bundle file
    onProgress?.('Writing bundle file...');
    const json = prettyPrint
      ? JSON.stringify(bundle, null, 2)
      : JSON.stringify(bundle);

    await fs.promises.writeFile(outputPath, json, 'utf8');

    const stats = fs.statSync(outputPath);
    const duration = Date.now() - startTime;

    onProgress?.(`Bundle created successfully in ${duration}ms`);

    return {
      filePath: outputPath,
      packagesExported: allPackages.length,
      fileSize: stats.size,
      duration
    };
  }

  /**
   * Export package to markdown format (for documentation)
   */
  async exportToMarkdown(
    packageId: string,
    outputPath: string,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const { onProgress } = options;

    onProgress?.(`Exporting package ${packageId} to markdown...`);

    // Get package
    const pkg = this.packageManager.getPackageById(packageId);
    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`);
    }

    // Generate markdown
    const markdown = this.packageToMarkdown(pkg);

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    await fs.promises.writeFile(outputPath, markdown, 'utf8');

    const stats = fs.statSync(outputPath);
    const duration = Date.now() - startTime;

    onProgress?.(`Markdown exported successfully in ${duration}ms`);

    return {
      filePath: outputPath,
      packagesExported: 1,
      fileSize: stats.size,
      duration
    };
  }

  /**
   * Collect package and all its dependencies recursively
   */
  private collectDependencies(pkg: ExpertisePackage): ExpertisePackage[] {
    const collected: ExpertisePackage[] = [pkg];
    const visited = new Set<string>([pkg.id]);

    const collectRecursive = (currentPkg: ExpertisePackage) => {
      if (!currentPkg.dependencies) return;

      for (const dep of currentPkg.dependencies) {
        if (visited.has(dep.packageId)) continue;

        const depPackage = this.packageManager.getPackageById(dep.packageId);
        if (depPackage) {
          visited.add(dep.packageId);
          collected.push(depPackage);
          collectRecursive(depPackage);
        }
      }
    };

    collectRecursive(pkg);
    return collected;
  }

  /**
   * Convert package to markdown format
   */
  private packageToMarkdown(pkg: ExpertisePackage): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${pkg.name}`);
    lines.push('');
    lines.push(pkg.description);
    lines.push('');

    // Metadata
    lines.push('## Metadata');
    lines.push('');
    lines.push(`- **ID**: ${pkg.id}`);
    lines.push(`- **Version**: ${pkg.version}`);
    lines.push(`- **Authority**: ${pkg.authority}`);
    lines.push(`- **Enforcement**: ${pkg.enforcement}`);
    lines.push(`- **Domain**: ${pkg.domain}`);
    lines.push(`- **Author**: ${pkg.author.name} (${pkg.author.role})`);
    if (pkg.author.organization) {
      lines.push(`- **Organization**: ${pkg.author.organization}`);
    }
    lines.push('');

    // Rules
    if (pkg.rules.length > 0) {
      lines.push('## Rules');
      lines.push('');
      for (const rule of pkg.rules) {
        lines.push(`### ${rule.name}`);
        lines.push('');
        lines.push(`**Category**: ${rule.category}`);
        lines.push(`**Severity**: ${rule.severity}`);
        lines.push('');
        lines.push('**Requirement**:');
        lines.push(rule.requirement);
        lines.push('');
        if (rule.rationale) {
          lines.push('**Rationale**:');
          lines.push(rule.rationale);
          lines.push('');
        }
      }
    }

    // Patterns
    if (pkg.patterns.length > 0) {
      lines.push('## Patterns');
      lines.push('');
      for (const pattern of pkg.patterns) {
        lines.push(`### ${pattern.name}`);
        lines.push('');
        lines.push(pattern.description);
        lines.push('');
        if (pattern.template) {
          lines.push('**Template**:');
          lines.push('```');
          lines.push(pattern.template);
          lines.push('```');
          lines.push('');
        }
      }
    }

    // Planning Templates
    if (pkg.planningTemplates.length > 0) {
      lines.push('## Planning Templates');
      lines.push('');
      for (const template of pkg.planningTemplates) {
        lines.push(`### ${template.name}`);
        lines.push('');
        for (const section of template.sections) {
          lines.push(`#### ${section.title} ${section.required ? '[REQUIRED]' : '[OPTIONAL]'}`);
          lines.push('');
          lines.push(section.prompt);
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }
}
