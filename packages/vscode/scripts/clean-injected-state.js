#!/usr/bin/env node

/**
 * Clean persisted injectedTo state from template files
 *
 * This script removes the runtime-only `injectedTo` arrays from all template JSON files.
 * The scanner will provide fresh injection status on the next extension load.
 *
 * Usage:
 *   node scripts/clean-injected-state.js [path-to-workspace-root]
 *
 * Example:
 *   node scripts/clean-injected-state.js /mnt/c/projects/agent-brain-platform
 */

const fs = require('fs');
const path = require('path');

// Get workspace root from command line or use current directory
const workspaceRoot = process.argv[2] || process.cwd();
const templatesDir = path.join(workspaceRoot, '.agent-brain', 'templates');

console.log('🧹 Cleaning injected state from templates...');
console.log(`📂 Templates directory: ${templatesDir}`);

if (!fs.existsSync(templatesDir)) {
  console.error(`❌ Templates directory not found: ${templatesDir}`);
  process.exit(1);
}

let processedCount = 0;
let cleanedCount = 0;
let errorCount = 0;

/**
 * Recursively process all JSON files in directory
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      processTemplateFile(fullPath);
    }
  }
}

/**
 * Remove injectedTo arrays from a template file
 */
function processTemplateFile(filePath) {
  try {
    processedCount++;

    // Read template
    const content = fs.readFileSync(filePath, 'utf8');
    const template = JSON.parse(content);

    // Check if any items have injectedTo arrays
    let hasInjectedState = false;
    if (template.items && Array.isArray(template.items)) {
      for (const item of template.items) {
        if (item.injectedTo && Array.isArray(item.injectedTo) && item.injectedTo.length > 0) {
          hasInjectedState = true;
          break;
        }
      }
    }

    if (!hasInjectedState) {
      // Already clean
      return;
    }

    console.log(`🔧 Cleaning: ${path.basename(filePath)}`);

    // Strip injectedTo from all items
    if (template.items && Array.isArray(template.items)) {
      template.items = template.items.map(item => {
        const { injectedTo, ...cleanItem } = item;
        return cleanItem;
      });
    }

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2) + '\n', 'utf8');
    cleanedCount++;

    console.log(`  ✅ Cleaned ${path.relative(templatesDir, filePath)}`);

  } catch (error) {
    errorCount++;
    console.error(`  ❌ Error processing ${path.basename(filePath)}: ${error.message}`);
  }
}

// Process all template files
try {
  processDirectory(templatesDir);

  console.log('\n📊 Summary:');
  console.log(`  Total files processed: ${processedCount}`);
  console.log(`  Files cleaned: ${cleanedCount}`);
  console.log(`  Errors: ${errorCount}`);

  if (cleanedCount > 0) {
    console.log('\n✨ Done! Reload the extension to see fresh injection status from scanner.');
  } else {
    console.log('\n✨ All templates are already clean!');
  }

  process.exit(errorCount > 0 ? 1 : 0);

} catch (error) {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
}
