#!/usr/bin/env node
/**
 * Pathway Test Debugger CLI
 *
 * Command-line tool for debugging failed pathway tests.
 * Reads test results, analyzes failures, and outputs AI-debuggable context.
 *
 * Usage:
 *   npm run debug-pathway -- <test-name>
 *   npm run debug-pathway -- --latest
 *   npm run debug-pathway -- --pathway DATA_INGESTION
 */

import * as fs from 'fs';
import * as path from 'path';

interface PathwayTestResult {
    pathway: string;
    status: 'passed' | 'failed' | 'partial';
    testName: string;
    timestamp: string;
    report: any;
    debugAnalysis?: any;
}

interface PathwayResultsFile {
    testRun: {
        timestamp: string;
        totalTests: number;
        passed: number;
        failed: number;
    };
    results: PathwayTestResult[];
}

/**
 * Main CLI entry point
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
        printHelp();
        process.exit(0);
    }

    const resultsFile = findResultsFile();
    if (!resultsFile) {
        console.error('❌ No pathway test results found. Run tests first with: npm test -- pathways');
        process.exit(1);
    }

    const results = loadResults(resultsFile);

    if (args.includes('--latest')) {
        debugLatestFailure(results);
    } else if (args.includes('--pathway')) {
        const pathwayName = args[args.indexOf('--pathway') + 1];
        debugPathway(results, pathwayName);
    } else if (args.includes('--all')) {
        debugAllFailures(results);
    } else if (args.includes('--summary')) {
        printSummary(results);
    } else {
        const testName = args[0];
        debugSpecificTest(results, testName);
    }
}

/**
 * Print help text
 */
function printHelp() {
    console.log(`
Pathway Test Debugger CLI

Debug failed pathway tests with AI-assisted analysis.

USAGE:
  debug-pathway-test [OPTIONS] [TEST_NAME]

OPTIONS:
  --help              Show this help message
  --latest            Debug the most recent failure
  --pathway <NAME>    Debug all failures for a specific pathway
  --all               Debug all failures
  --summary           Show summary of test results
  --json              Output as JSON for Agent-Brain webhook
  --export <FILE>     Export debug analysis to file

EXAMPLES:
  # Debug latest failure
  npm run debug-pathway -- --latest

  # Debug specific pathway
  npm run debug-pathway -- --pathway DATA_INGESTION

  # Debug specific test
  npm run debug-pathway -- "should complete full data ingestion pathway"

  # Export for Agent-Brain
  npm run debug-pathway -- --latest --json > failure.json

  # Show summary
  npm run debug-pathway -- --summary
`);
}

/**
 * Find the pathway results file
 */
function findResultsFile(): string | null {
    const possiblePaths = [
        path.join(process.cwd(), 'pathway-results.json'),
        path.join(process.cwd(), 'test-results', 'pathway-results.json'),
        path.join(process.cwd(), 'coverage', 'pathway-results.json')
    ];

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }

    return null;
}

/**
 * Load results from file
 */
function loadResults(filePath: string): PathwayResultsFile {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Debug the latest failure
 */
function debugLatestFailure(results: PathwayResultsFile) {
    const failures = results.results.filter(r => r.status === 'failed');

    if (failures.length === 0) {
        console.log('✅ No failures found! All pathway tests passed.');
        process.exit(0);
    }

    const latest = failures[failures.length - 1];

    console.log('\n=== LATEST PATHWAY FAILURE ===\n');
    printDebugAnalysis(latest);
}

/**
 * Debug all failures for a specific pathway
 */
function debugPathway(results: PathwayResultsFile, pathwayName: string) {
    const pathwayFailures = results.results.filter(
        r => r.pathway === pathwayName && r.status === 'failed'
    );

    if (pathwayFailures.length === 0) {
        console.log(`✅ No failures found for pathway: ${pathwayName}`);
        process.exit(0);
    }

    console.log(`\n=== ${pathwayName} PATHWAY FAILURES (${pathwayFailures.length}) ===\n`);

    pathwayFailures.forEach((failure, index) => {
        console.log(`\n--- Failure ${index + 1}: ${failure.testName} ---\n`);
        printDebugAnalysis(failure);
    });
}

/**
 * Debug all failures
 */
function debugAllFailures(results: PathwayResultsFile) {
    const failures = results.results.filter(r => r.status === 'failed');

    if (failures.length === 0) {
        console.log('✅ No failures found! All pathway tests passed.');
        process.exit(0);
    }

    console.log(`\n=== ALL PATHWAY FAILURES (${failures.length}) ===\n`);

    failures.forEach((failure, index) => {
        console.log(`\n--- Failure ${index + 1}: ${failure.pathway} - ${failure.testName} ---\n`);
        printDebugAnalysis(failure);
    });
}

/**
 * Debug a specific test by name
 */
function debugSpecificTest(results: PathwayResultsFile, testName: string) {
    const test = results.results.find(r =>
        r.testName.toLowerCase().includes(testName.toLowerCase())
    );

    if (!test) {
        console.error(`❌ Test not found: ${testName}`);
        console.log('\nAvailable tests:');
        results.results.forEach(r => {
            console.log(`  - ${r.testName} (${r.pathway})`);
        });
        process.exit(1);
    }

    console.log(`\n=== DEBUG: ${test.testName} ===\n`);
    printDebugAnalysis(test);
}

/**
 * Print debug analysis for a test result
 */
function printDebugAnalysis(result: PathwayTestResult) {
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify(result.debugAnalysis || result.report, null, 2));
        return;
    }

    const analysis = result.debugAnalysis;

    if (!analysis) {
        console.log('No debug analysis available for this test.');
        console.log('Raw report:');
        console.log(JSON.stringify(result.report, null, 2));
        return;
    }

    // Print formatted analysis
    console.log(`Pathway: ${analysis.pathway}`);
    console.log(`Status: ${analysis.status}`);
    console.log(`\nFAILURE POINT:`);
    console.log(`  ${analysis.failurePoint.milestone} (index ${analysis.failurePoint.index})`);
    console.log(`  Reason: ${analysis.failurePoint.reason}`);

    console.log(`\nSUMMARY:`);
    console.log(`  ${analysis.summary}`);

    if (analysis.hypotheses && analysis.hypotheses.length > 0) {
        console.log(`\nTOP HYPOTHESES:`);
        analysis.hypotheses.slice(0, 3).forEach((h: any, i: number) => {
            console.log(`\n${i + 1}. [${h.confidence}% confidence] ${h.category.toUpperCase()}`);
            console.log(`   ${h.description}`);
            if (h.evidence && h.evidence.length > 0) {
                console.log(`   Evidence:`);
                h.evidence.forEach((e: string) => console.log(`     - ${e}`));
            }
            if (h.suggestedFix) {
                console.log(`   💡 Suggested Fix: ${h.suggestedFix}`);
            }
        });
    }

    if (analysis.checklist && analysis.checklist.length > 0) {
        console.log(`\nDEBUGGING CHECKLIST:`);
        analysis.checklist.slice(0, 5).forEach((item: any) => {
            console.log(`  [${item.priority.toUpperCase()}] ${item.category}: ${item.description}`);
        });
    }

    if (analysis.relatedCode && analysis.relatedCode.length > 0) {
        console.log(`\nRELATED CODE:`);
        analysis.relatedCode.slice(0, 5).forEach((loc: any) => {
            console.log(`  📁 ${loc.file}${loc.function ? `::${loc.function}` : ''}`);
            console.log(`     ${loc.reason}`);
        });
    }

    if (analysis.logAnalysis) {
        console.log(`\nLOG ANALYSIS:`);
        console.log(`  Total: ${analysis.logAnalysis.totalLogs}`);
        console.log(`  Errors: ${analysis.logAnalysis.errorCount}`);
        console.log(`  Warnings: ${analysis.logAnalysis.warningCount}`);

        if (analysis.logAnalysis.suspiciousPatterns.length > 0) {
            console.log(`  Suspicious: ${analysis.logAnalysis.suspiciousPatterns.join(', ')}`);
        }
    }

    console.log('\n');
}

/**
 * Print summary of test results
 */
function printSummary(results: PathwayResultsFile) {
    console.log('\n=== PATHWAY TEST SUMMARY ===\n');
    console.log(`Test Run: ${results.testRun.timestamp}`);
    console.log(`Total Tests: ${results.testRun.totalTests}`);
    console.log(`Passed: ${results.testRun.passed} ✅`);
    console.log(`Failed: ${results.testRun.failed} ❌`);

    const byPathway: Record<string, { passed: number; failed: number }> = {};

    results.results.forEach(r => {
        if (!byPathway[r.pathway]) {
            byPathway[r.pathway] = { passed: 0, failed: 0 };
        }
        if (r.status === 'passed') {
            byPathway[r.pathway].passed++;
        } else {
            byPathway[r.pathway].failed++;
        }
    });

    console.log('\nBy Pathway:');
    Object.entries(byPathway).forEach(([pathway, stats]) => {
        const total = stats.passed + stats.failed;
        const passRate = ((stats.passed / total) * 100).toFixed(0);
        const icon = stats.failed === 0 ? '✅' : '❌';
        console.log(`  ${icon} ${pathway}: ${stats.passed}/${total} (${passRate}%)`);
    });

    if (results.testRun.failed > 0) {
        console.log('\nTo debug failures:');
        console.log('  npm run debug-pathway -- --latest');
        console.log('  npm run debug-pathway -- --all');
    }

    console.log('');
}

// Run CLI
main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
