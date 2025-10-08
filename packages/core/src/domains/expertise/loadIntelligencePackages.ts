/**
 * Load Intelligence Packages Script
 *
 * Loads Agent Brain's own intelligence packages from markdown files:
 * - ADRs (Architectural Decision Records)
 * - Patterns (Development Patterns)
 * - Golden Paths (Step-by-step workflows)
 * - Planning Templates (Structured planning)
 *
 * This is the FIRST USE CASE of the expertise package system.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PackageManager } from './PackageManager';
import { MarkdownConverter } from './MarkdownConverter';
import type { ExpertisePackage } from './types';

export interface LoadIntelligenceOptions {
  /** Path to docs/agent_brain_intelligence directory */
  intelligencePath: string;

  /** Path to store packages (.agent-brain/packages) */
  storagePath: string;

  /** Whether to overwrite existing packages */
  overwrite?: boolean;

  /** Callback for progress updates */
  onProgress?: (message: string) => void;
}

export interface LoadIntelligenceResult {
  /** Packages successfully loaded */
  loaded: ExpertisePackage[];

  /** Packages that failed to load */
  failed: Array<{
    filename: string;
    error: string;
  }>;

  /** Total time taken (ms) */
  duration: number;
}

/**
 * Load Agent Brain intelligence packages
 */
export async function loadIntelligencePackages(
  options: LoadIntelligenceOptions
): Promise<LoadIntelligenceResult> {
  const startTime = Date.now();
  const result: LoadIntelligenceResult = {
    loaded: [],
    failed: [],
    duration: 0
  };

  const { intelligencePath, storagePath, overwrite = false, onProgress } = options;

  // Initialize package manager
  const packageManager = new PackageManager(storagePath);
  const converter = new MarkdownConverter();

  // Progress callback helper
  const progress = (message: string) => {
    if (onProgress) {
      onProgress(message);
    }
  };

  progress('Starting intelligence package loading...');

  // Define markdown files to load
  const markdownFiles = [
    {
      filename: 'agentbrain-adrs.md',
      converter: (content: string) => converter.convertADRsToPackage(content),
      type: 'ADRs'
    },
    {
      filename: 'agentbrain-patterns.md',
      converter: (content: string) => converter.convertPatternsToPackage(content),
      type: 'Patterns'
    },
    {
      filename: 'agentbrain-golden-paths.md',
      converter: (content: string) => converter.convertGoldenPathsToPackage(content),
      type: 'Golden Paths'
    },
    {
      filename: 'agentbrain-planning-templates.md',
      converter: (content: string) => converter.convertPlanningTemplatesToPackage(content),
      type: 'Planning Templates'
    }
  ];

  // Load each markdown file
  for (const file of markdownFiles) {
    const filePath = path.join(intelligencePath, file.filename);

    try {
      progress(`Loading ${file.type} from ${file.filename}...`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        result.failed.push({
          filename: file.filename,
          error: 'File not found'
        });
        progress(`  ⚠️  File not found: ${file.filename}`);
        continue;
      }

      // Read markdown file
      const markdown = await fs.promises.readFile(filePath, 'utf8');

      // Convert to package
      const pkg = file.converter(markdown);

      // Check if package already exists
      if (!overwrite && packageManager.hasPackage(pkg.id)) {
        progress(`  ⏭️  Package already exists: ${pkg.id} (skipping)`);
        continue;
      }

      // Load package
      await packageManager.loadPackage(pkg);

      result.loaded.push(pkg);
      progress(`  ✓ Loaded ${file.type}: ${pkg.id} (${pkg.rules.length} rules, ${pkg.patterns.length} patterns, ${pkg.planningTemplates.length} templates)`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.failed.push({
        filename: file.filename,
        error: errorMessage
      });
      progress(`  ✗ Failed to load ${file.filename}: ${errorMessage}`);
    }
  }

  // Also load the main expertise package JSON if it exists
  const expertiseJsonPath = path.join(intelligencePath, 'agentbrain-expertise-package.json');
  if (fs.existsSync(expertiseJsonPath)) {
    try {
      progress('Loading main expertise package from JSON...');
      const pkg = await packageManager.loadPackageFromJSON(expertiseJsonPath);
      result.loaded.push(pkg);
      progress(`  ✓ Loaded expertise package: ${pkg.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.failed.push({
        filename: 'agentbrain-expertise-package.json',
        error: errorMessage
      });
      progress(`  ✗ Failed to load expertise package: ${errorMessage}`);
    }
  }

  result.duration = Date.now() - startTime;

  // Summary
  progress('');
  progress('=== Load Summary ===');
  progress(`Loaded: ${result.loaded.length} packages`);
  progress(`Failed: ${result.failed.length} packages`);
  progress(`Duration: ${result.duration}ms`);

  return result;
}

/**
 * Standalone script entry point
 * Usage: node loadIntelligencePackages.js
 */
export async function runStandalone(): Promise<void> {
  // Determine paths
  const projectRoot = path.resolve(__dirname, '../../../../../');
  const intelligencePath = path.join(projectRoot, 'docs/agent_brain_intelligence');
  const storagePath = path.join(projectRoot, '.agent-brain');

  console.log('Agent Brain Intelligence Package Loader');
  console.log('======================================');
  console.log(`Intelligence path: ${intelligencePath}`);
  console.log(`Storage path: ${storagePath}`);
  console.log('');

  // Load packages
  const result = await loadIntelligencePackages({
    intelligencePath,
    storagePath,
    overwrite: false,
    onProgress: (message) => console.log(message)
  });

  // Exit with error code if any failed
  if (result.failed.length > 0) {
    console.error('\nSome packages failed to load:');
    for (const failure of result.failed) {
      console.error(`  - ${failure.filename}: ${failure.error}`);
    }
    process.exit(1);
  }

  console.log('\n✓ All packages loaded successfully');
  process.exit(0);
}

// If running as standalone script
if (require.main === module) {
  runStandalone().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
