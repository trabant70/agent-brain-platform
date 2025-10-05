/**
 * PathwayReporter - Custom Jest Reporter for Pathway Tests
 *
 * Collects pathway test results and outputs pathway-results.json
 * for consumption by the CLI debugger and Agent-Brain webhook.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    Reporter,
    Test,
    TestResult,
    AggregatedResult
} from '@jest/reporters';

interface PathwayTestResult {
    pathway: string;
    status: 'passed' | 'failed' | 'partial';
    testName: string;
    timestamp: string;
    duration: number;
    report?: any;
    debugAnalysis?: any;
}

interface PathwayResultsFile {
    testRun: {
        timestamp: string;
        totalTests: number;
        passed: number;
        failed: number;
        duration: number;
    };
    results: PathwayTestResult[];
}

/**
 * PathwayReporter - Custom Jest reporter for pathway tests
 */
export default class PathwayReporter implements Reporter {
    private results: PathwayTestResult[] = [];
    private startTime: number = 0;

    onRunStart() {
        this.startTime = Date.now();
        this.results = [];
        console.log('\n🔬 Pathway Testing Started\n');
    }

    onTestResult(test: Test, testResult: TestResult) {
        // Only process pathway tests
        if (!test.path.includes('pathways/generated')) {
            return;
        }

        testResult.testResults.forEach(assertionResult => {
            const testName = assertionResult.title;
            const pathway = this.extractPathwayFromTest(test.path);
            const status = this.determineStatus(assertionResult);

            // Extract pathway report and debug analysis from console output
            const { report, debugAnalysis } = this.extractPathwayData(
                assertionResult.failureMessages
            );

            this.results.push({
                pathway,
                status,
                testName,
                timestamp: new Date().toISOString(),
                duration: assertionResult.duration || 0,
                report,
                debugAnalysis
            });
        });
    }

    onRunComplete(contexts: Set<any>, results: AggregatedResult) {
        const duration = Date.now() - this.startTime;

        const outputData: PathwayResultsFile = {
            testRun: {
                timestamp: new Date().toISOString(),
                totalTests: results.numTotalTests,
                passed: results.numPassedTests,
                failed: results.numFailedTests,
                duration
            },
            results: this.results
        };

        // Write results to file
        const outputPath = path.join(process.cwd(), 'pathway-results.json');
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

        // Print summary
        this.printSummary(outputData);

        console.log(`\n📊 Pathway results written to: ${outputPath}`);

        // Print debug hints if there are failures
        if (results.numFailedTests > 0) {
            console.log('\n💡 To debug failures:');
            console.log('   npm run debug-pathway -- --latest');
            console.log('   npm run debug-pathway -- --all\n');
        }
    }

    /**
     * Extract pathway name from test file path
     */
    private extractPathwayFromTest(testPath: string): string {
        const filename = path.basename(testPath, '.pathway.test.ts');
        return filename
            .split('-')
            .map(word => word.toUpperCase())
            .join('_');
    }

    /**
     * Determine test status
     */
    private determineStatus(assertionResult: any): 'passed' | 'failed' | 'partial' {
        if (assertionResult.status === 'passed') {
            return 'passed';
        }

        // Check if it's a partial failure (some milestones reached)
        const failureText = assertionResult.failureMessages.join('\n');
        if (failureText.includes('milestones reached') && !failureText.includes('0/')) {
            return 'partial';
        }

        return 'failed';
    }

    /**
     * Extract pathway report and debug analysis from failure messages
     */
    private extractPathwayData(failureMessages: string[]): {
        report?: any;
        debugAnalysis?: any;
    } {
        const fullMessage = failureMessages.join('\n');

        let report: any;
        let debugAnalysis: any;

        // Try to extract JSON blocks from console output
        const jsonBlocks = fullMessage.match(/\{[\s\S]*?\}/g) || [];

        for (const block of jsonBlocks) {
            try {
                const parsed = JSON.parse(block);

                // Identify report vs debug analysis by structure
                if (parsed.pathway && parsed.timeline) {
                    report = parsed;
                } else if (parsed.pathway && parsed.hypotheses) {
                    debugAnalysis = parsed;
                }
            } catch {
                // Not valid JSON, skip
            }
        }

        return { report, debugAnalysis };
    }

    /**
     * Print summary to console
     */
    private printSummary(data: PathwayResultsFile) {
        console.log('\n' + '='.repeat(60));
        console.log('  PATHWAY TEST SUMMARY');
        console.log('='.repeat(60));

        const passRate = ((data.testRun.passed / data.testRun.totalTests) * 100).toFixed(0);

        console.log(`\n  Total Tests:  ${data.testRun.totalTests}`);
        console.log(`  Passed:       ${data.testRun.passed} ✅`);
        console.log(`  Failed:       ${data.testRun.failed} ❌`);
        console.log(`  Pass Rate:    ${passRate}%`);
        console.log(`  Duration:     ${(data.testRun.duration / 1000).toFixed(2)}s`);

        // Group by pathway
        const byPathway: Record<string, { passed: number; failed: number; partial: number }> = {};

        data.results.forEach(r => {
            if (!byPathway[r.pathway]) {
                byPathway[r.pathway] = { passed: 0, failed: 0, partial: 0 };
            }
            byPathway[r.pathway][r.status]++;
        });

        console.log('\n  By Pathway:');
        Object.entries(byPathway)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([pathway, stats]) => {
                const total = stats.passed + stats.failed + stats.partial;
                const icon = stats.failed === 0 ? '✅' : '❌';
                const partialText = stats.partial > 0 ? ` (${stats.partial} partial)` : '';
                console.log(`    ${icon} ${pathway.padEnd(20)} ${stats.passed}/${total}${partialText}`);
            });

        // List failures
        const failures = data.results.filter(r => r.status === 'failed');
        if (failures.length > 0) {
            console.log('\n  Failed Tests:');
            failures.forEach(f => {
                console.log(`    ❌ ${f.pathway}: ${f.testName}`);
            });
        }

        console.log('\n' + '='.repeat(60) + '\n');
    }
}
