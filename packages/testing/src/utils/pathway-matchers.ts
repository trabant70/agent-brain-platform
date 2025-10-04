/**
 * Jest Custom Matchers for Pathway Testing
 *
 * Provides fluent assertion methods for pathway-based tests:
 * - expect(asserter).toCompletePathway()
 * - expect(asserter).toReachMilestone(index)
 * - expect(asserter).toFailAtMilestone(index)
 */

import { PathwayAsserter, AssertionReport } from './PathwayAsserter';
import { LogPathway } from '../../src/utils/Logger';

declare global {
    namespace jest {
        interface Matchers<R> {
            toCompletePathway(): R;
            toReachMilestone(milestoneIndex: number): R;
            toFailAtMilestone(milestoneIndex: number): R;
            toHavePathwayErrors(): R;
            toCompleteWithinTime(maxMs: number): R;
        }
    }
}

/**
 * Assert that pathway completed successfully (all required milestones reached)
 */
function toCompletePathway(
    this: jest.MatcherContext,
    asserter: PathwayAsserter
): jest.CustomMatcherResult {
    const result = asserter.getResult();

    if (!result) {
        return {
            pass: false,
            message: () => 'PathwayAsserter.verify() was not called before assertion'
        };
    }

    const pass = result.passed;

    if (pass) {
        return {
            pass: true,
            message: () =>
                `Expected pathway ${LogPathway[result.pathway]} NOT to complete, but it did:\n` +
                `  ${result.reachedMilestones}/${result.totalMilestones} milestones reached\n` +
                `  Execution time: ${result.executionTime}ms`
        };
    } else {
        return {
            pass: false,
            message: () =>
                `Expected pathway ${LogPathway[result.pathway]} to complete, but it failed:\n\n` +
                asserter.getFailureReport() + '\n\n' +
                'AI Debug Context:\n' +
                asserter.toJSON()
        };
    }
}

/**
 * Assert that specific milestone was reached
 */
function toReachMilestone(
    this: jest.MatcherContext,
    asserter: PathwayAsserter,
    milestoneIndex: number
): jest.CustomMatcherResult {
    const result = asserter.getResult();

    if (!result) {
        return {
            pass: false,
            message: () => 'PathwayAsserter.verify() was not called before assertion'
        };
    }

    if (milestoneIndex < 0 || milestoneIndex >= result.timeline.length) {
        return {
            pass: false,
            message: () =>
                `Milestone index ${milestoneIndex} is out of range. ` +
                `Pathway has ${result.timeline.length} milestones.`
        };
    }

    const milestone = result.timeline[milestoneIndex];
    const pass = milestone.reached;

    if (pass) {
        return {
            pass: true,
            message: () =>
                `Expected milestone #${milestoneIndex} (${milestone.milestone.context}) NOT to be reached, but it was at ${milestone.timestamp}ms`
        };
    } else {
        return {
            pass: false,
            message: () =>
                `Expected milestone #${milestoneIndex} (${milestone.milestone.context}) to be reached, but it wasn't:\n` +
                `  Reason: ${milestone.reason}\n\n` +
                asserter.getFailureReport()
        };
    }
}

/**
 * Assert that pathway failed at specific milestone
 */
function toFailAtMilestone(
    this: jest.MatcherContext,
    asserter: PathwayAsserter,
    milestoneIndex: number
): jest.CustomMatcherResult {
    const result = asserter.getResult();

    if (!result) {
        return {
            pass: false,
            message: () => 'PathwayAsserter.verify() was not called before assertion'
        };
    }

    if (result.passed) {
        return {
            pass: false,
            message: () =>
                `Expected pathway to fail at milestone #${milestoneIndex}, but it completed successfully`
        };
    }

    const pass = result.failedAtIndex === milestoneIndex;

    if (pass) {
        return {
            pass: true,
            message: () =>
                `Expected pathway NOT to fail at milestone #${milestoneIndex}, but it did`
        };
    } else {
        return {
            pass: false,
            message: () =>
                `Expected pathway to fail at milestone #${milestoneIndex}, ` +
                `but it failed at milestone #${result.failedAtIndex}\n\n` +
                asserter.getFailureReport()
        };
    }
}

/**
 * Assert that pathway captured error logs
 */
function toHavePathwayErrors(
    this: jest.MatcherContext,
    asserter: PathwayAsserter
): jest.CustomMatcherResult {
    const result = asserter.getResult();

    if (!result) {
        return {
            pass: false,
            message: () => 'PathwayAsserter.verify() was not called before assertion'
        };
    }

    const errorLogs = result.capturedLogs.filter(log => log.level === 0); // LogLevel.ERROR = 0
    const pass = errorLogs.length > 0;

    if (pass) {
        return {
            pass: true,
            message: () =>
                `Expected pathway to have no errors, but found ${errorLogs.length}:\n` +
                errorLogs.map(log => `  - ${log.message}`).join('\n')
        };
    } else {
        return {
            pass: false,
            message: () => 'Expected pathway to have error logs, but none were found'
        };
    }
}

/**
 * Assert that pathway completed within time limit
 */
function toCompleteWithinTime(
    this: jest.MatcherContext,
    asserter: PathwayAsserter,
    maxMs: number
): jest.CustomMatcherResult {
    const result = asserter.getResult();

    if (!result) {
        return {
            pass: false,
            message: () => 'PathwayAsserter.verify() was not called before assertion'
        };
    }

    const pass = result.executionTime <= maxMs;

    if (pass) {
        return {
            pass: true,
            message: () =>
                `Expected pathway to take longer than ${maxMs}ms, ` +
                `but it completed in ${result.executionTime}ms`
        };
    } else {
        return {
            pass: false,
            message: () =>
                `Expected pathway to complete within ${maxMs}ms, ` +
                `but it took ${result.executionTime}ms (${result.executionTime - maxMs}ms over limit)`
        };
    }
}

// Register custom matchers
export const pathwayMatchers = {
    toCompletePathway,
    toReachMilestone,
    toFailAtMilestone,
    toHavePathwayErrors,
    toCompleteWithinTime
};

// Auto-extend Jest expect (can be imported in test setup)
if (typeof expect !== 'undefined' && typeof expect.extend === 'function') {
    expect.extend(pathwayMatchers);
}
