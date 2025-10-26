/**
 * AgentDebugHelper
 *
 * Generates agent-friendly debugging information:
 * - Violation summaries with explanations
 * - Step-by-step fix instructions
 * - Correct usage examples
 * - Learning extraction
 * - Context-aware guidance
 */

import { ExecutionTrace, ContractViolation } from '../types';
import { FixSuggester, FixSuggestion } from './FixSuggester';
import { ViolationRenderer } from '../visualization/ViolationRenderer';
import { DataFlowVisualizer } from '../visualization/DataFlowVisualizer';

/**
 * Debug report
 */
export interface DebugReport {
  summary: string;
  violations: ViolationDebugInfo[];
  suggestions: FixSuggestion[];
  examples: CodeExample[];
  learnings: string[];
  nextSteps: string[];
}

/**
 * Violation debug info
 */
export interface ViolationDebugInfo {
  violation: ContractViolation;
  explanation: string;
  impact: string;
  howToFix: string[];
}

/**
 * Code example
 */
export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
}

/**
 * AgentDebugHelper
 */
export class AgentDebugHelper {
  private fixSuggester: FixSuggester;
  private violationRenderer: ViolationRenderer;
  private dataFlowVisualizer: DataFlowVisualizer;

  constructor(
    fixSuggester?: FixSuggester,
    violationRenderer?: ViolationRenderer,
    dataFlowVisualizer?: DataFlowVisualizer
  ) {
    this.fixSuggester = fixSuggester || new FixSuggester();
    this.violationRenderer = violationRenderer || new ViolationRenderer();
    this.dataFlowVisualizer = dataFlowVisualizer || new DataFlowVisualizer();
  }

  /**
   * Generate debug report for execution trace
   */
  generateReport(trace: ExecutionTrace): DebugReport {
    const summary = this.generateSummary(trace);
    const violations = this.analyzeViolations(trace.violations);
    const suggestions = this.fixSuggester.suggestAll(trace.violations);
    const examples = this.generateExamples(trace);
    const learnings = this.extractLearnings(trace);
    const nextSteps = this.generateNextSteps(trace);

    return {
      summary,
      violations,
      suggestions,
      examples,
      learnings,
      nextSteps
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(trace: ExecutionTrace): string {
    const parts: string[] = [];

    parts.push(`Function: ${trace.context}`);

    if (trace.exit) {
      parts.push(`Duration: ${trace.exit.duration}ms`);
      parts.push(`Status: ${trace.violations.length > 0 ? 'Failed with violations' : 'Success'}`);
    } else if (trace.error) {
      parts.push(`Status: Error - ${trace.error.error.message}`);
    }

    parts.push(`Transformations: ${trace.transformations.length}`);
    parts.push(`Mutations: ${trace.mutations.length}`);
    parts.push(`Violations: ${trace.violations.length}`);

    if (trace.violations.length > 0) {
      const critical = trace.violations.filter(v => v.severity === 'critical').length;
      const errors = trace.violations.filter(v => v.severity === 'error').length;
      const warnings = trace.violations.filter(v => v.severity === 'warning').length;

      parts.push(`  - Critical: ${critical}, Errors: ${errors}, Warnings: ${warnings}`);
    }

    return parts.join('\n');
  }

  /**
   * Analyze violations in detail
   */
  private analyzeViolations(violations: ContractViolation[]): ViolationDebugInfo[] {
    return violations.map(violation => ({
      violation,
      explanation: this.explainViolation(violation),
      impact: this.assessImpact(violation),
      howToFix: this.generateFixSteps(violation)
    }));
  }

  /**
   * Explain a violation in detail
   */
  private explainViolation(violation: ContractViolation): string {
    const parts: string[] = [];

    parts.push(`This is a ${violation.type} violation with ${violation.severity} severity.`);

    switch (violation.type) {
      case 'input':
        parts.push('Input parameters do not meet the contract requirements.');
        break;
      case 'output':
        parts.push('The function return value does not match the expected contract.');
        break;
      case 'precondition':
        parts.push('A precondition was not satisfied before function execution.');
        break;
      case 'postcondition':
        parts.push('A postcondition was not satisfied after function execution.');
        break;
      case 'invariant':
        parts.push('An invariant that must always hold was violated.');
        break;
    }

    if (violation.path) {
      parts.push(`Location: ${violation.path}`);
    }

    parts.push(`Expected: ${violation.expected}`);
    parts.push(`Actual: ${violation.actual}`);

    if (violation.agentMessage) {
      parts.push(`\nGuidance: ${violation.agentMessage}`);
    }

    return parts.join('\n');
  }

  /**
   * Assess the impact of a violation
   */
  private assessImpact(violation: ContractViolation): string {
    switch (violation.severity) {
      case 'critical':
        return 'CRITICAL: This violation will likely cause runtime errors or data corruption. Must be fixed immediately.';
      case 'error':
        return 'ERROR: This violation indicates incorrect behavior that will produce wrong results. Should be fixed promptly.';
      case 'warning':
        return 'WARNING: This violation indicates a potential issue that may cause problems in edge cases. Should be reviewed.';
      case 'info':
        return 'INFO: This is informational and may not require action, but review for optimization opportunities.';
    }
  }

  /**
   * Generate step-by-step fix instructions
   */
  private generateFixSteps(violation: ContractViolation): string[] {
    const steps: string[] = [];

    steps.push('1. Review the contract definition to understand requirements');
    steps.push(`2. Locate the issue at: ${violation.path || 'the violation location'}`);

    switch (violation.type) {
      case 'input':
        steps.push('3. Validate and transform input before calling the function');
        steps.push('4. Add type guards or validation logic');
        steps.push('5. Update callers to provide correct input');
        break;
      case 'output':
        steps.push('3. Review the return statement');
        steps.push('4. Ensure the returned value matches the expected type and shape');
        steps.push('5. Add transformation logic if needed');
        break;
      case 'precondition':
        steps.push('3. Add validation at function entry');
        steps.push('4. Throw descriptive error if precondition fails');
        steps.push('5. Document the precondition requirement');
        break;
      case 'postcondition':
        steps.push('3. Add assertion before returning');
        steps.push('4. Ensure all code paths satisfy the postcondition');
        steps.push('5. Add tests to verify postcondition');
        break;
      case 'invariant':
        steps.push('3. Review all state modifications');
        steps.push('4. Ensure invariant holds after each operation');
        steps.push('5. Add defensive checks where invariant could break');
        break;
    }

    steps.push('6. Add unit tests to prevent regression');
    steps.push('7. Verify the fix with the data contract system');

    return steps;
  }

  /**
   * Generate code examples
   */
  private generateExamples(trace: ExecutionTrace): CodeExample[] {
    const examples: CodeExample[] = [];

    // Example: Correct usage
    examples.push({
      title: 'Correct Usage Pattern',
      description: 'This example shows the correct way to call this function with valid inputs.',
      code: this.generateCorrectUsageExample(trace),
      language: 'typescript'
    });

    // Example: Input validation
    if (trace.violations.some(v => v.type === 'input')) {
      examples.push({
        title: 'Input Validation',
        description: 'Add validation before calling the function to ensure inputs meet requirements.',
        code: this.generateValidationExample(trace),
        language: 'typescript'
      });
    }

    // Example: Error handling
    if (trace.error) {
      examples.push({
        title: 'Error Handling',
        description: 'Proper error handling for this function.',
        code: this.generateErrorHandlingExample(trace),
        language: 'typescript'
      });
    }

    return examples;
  }

  /**
   * Generate correct usage example
   */
  private generateCorrectUsageExample(trace: ExecutionTrace): string {
    const functionName = trace.context.split('.').pop() || 'function';

    const lines: string[] = [];
    lines.push(`// Correct usage of ${functionName}`);
    lines.push('');

    // Generate sample arguments based on entry
    if (trace.entry.args.length > 0) {
      lines.push('// Prepare valid inputs');
      trace.entry.args.forEach((arg, index) => {
        const argType = arg.type.primitive;
        const sampleValue = this.generateSampleValue(argType);
        lines.push(`const arg${index}: ${argType} = ${sampleValue};`);
      });
      lines.push('');
    }

    // Function call
    const argList = trace.entry.args.map((_, i) => `arg${i}`).join(', ');
    lines.push(`const result = await ${functionName}(${argList});`);
    lines.push('');
    lines.push('// Result will match the expected contract');

    return lines.join('\n');
  }

  /**
   * Generate validation example
   */
  private generateValidationExample(trace: ExecutionTrace): string {
    const functionName = trace.context.split('.').pop() || 'function';

    const lines: string[] = [];
    lines.push('// Validate inputs before calling function');
    lines.push('');

    trace.entry.args.forEach((arg, index) => {
      const argType = arg.type.primitive;
      lines.push(`if (typeof arg${index} !== '${argType}') {`);
      lines.push(`  throw new Error('arg${index} must be ${argType}');`);
      lines.push('}');
    });

    lines.push('');
    const argList = trace.entry.args.map((_, i) => `arg${i}`).join(', ');
    lines.push(`const result = await ${functionName}(${argList});`);

    return lines.join('\n');
  }

  /**
   * Generate error handling example
   */
  private generateErrorHandlingExample(trace: ExecutionTrace): string {
    const functionName = trace.context.split('.').pop() || 'function';

    const lines: string[] = [];
    lines.push('// Proper error handling');
    lines.push('try {');
    lines.push(`  const result = await ${functionName}(...args);`);
    lines.push('  // Handle success');
    lines.push('} catch (error) {');
    lines.push('  // Handle contract violation or other errors');
    lines.push('  if (error instanceof ContractViolationError) {');
    lines.push('    console.error(\'Contract violation:\', error.violations);');
    lines.push('  } else {');
    lines.push('    console.error(\'Unexpected error:\', error);');
    lines.push('  }');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Extract learnings from trace
   */
  private extractLearnings(trace: ExecutionTrace): string[] {
    const learnings: string[] = [];

    // Type learnings
    const typeViolations = trace.violations.filter(v => v.message.toLowerCase().includes('type'));
    if (typeViolations.length > 0) {
      learnings.push('Always validate input types before processing');
      learnings.push('Use TypeScript strict mode to catch type errors at compile time');
    }

    // Constraint learnings
    const constraintViolations = trace.violations.filter(v =>
      v.message.toLowerCase().includes('min') ||
      v.message.toLowerCase().includes('max') ||
      v.message.toLowerCase().includes('range')
    );
    if (constraintViolations.length > 0) {
      learnings.push('Implement bounds checking for numeric values');
      learnings.push('Add validation for size constraints on strings and arrays');
    }

    // Pattern learnings
    const patternViolations = trace.violations.filter(v => v.message.toLowerCase().includes('pattern'));
    if (patternViolations.length > 0) {
      learnings.push('Use regex validation for formatted strings (emails, URLs, etc.)');
      learnings.push('Provide clear error messages for pattern mismatches');
    }

    // Performance learnings
    if (trace.exit && trace.exit.duration > 1000) {
      learnings.push(`Function took ${trace.exit.duration}ms - consider optimization`);
    }

    // Mutation learnings
    if (trace.mutations.length > 0) {
      learnings.push('Minimize side effects and mutations for predictable behavior');
      learnings.push('Document all state changes in the contract');
    }

    return learnings;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(trace: ExecutionTrace): string[] {
    const steps: string[] = [];

    if (trace.violations.length === 0) {
      steps.push('✅ All contracts satisfied - no action needed');
      return steps;
    }

    // Prioritize critical violations
    const critical = trace.violations.filter(v => v.severity === 'critical');
    if (critical.length > 0) {
      steps.push(`🔥 Fix ${critical.length} critical violation(s) immediately`);
    }

    // Then errors
    const errors = trace.violations.filter(v => v.severity === 'error');
    if (errors.length > 0) {
      steps.push(`❌ Fix ${errors.length} error(s) promptly`);
    }

    // Then warnings
    const warnings = trace.violations.filter(v => v.severity === 'warning');
    if (warnings.length > 0) {
      steps.push(`⚠️ Review ${warnings.length} warning(s)`);
    }

    steps.push('📝 Add unit tests for each fix');
    steps.push('🔄 Re-run with data correctness monitoring enabled');
    steps.push('📚 Update documentation with contract requirements');

    return steps;
  }

  /**
   * Generate sample value for type
   */
  private generateSampleValue(type: string): string {
    switch (type) {
      case 'string':
        return '"example"';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'object':
        return '{}';
      case 'array':
        return '[]';
      default:
        return 'null';
    }
  }

  /**
   * Format report as Markdown
   */
  formatAsMarkdown(report: DebugReport): string {
    const sections: string[] = [];

    // Summary
    sections.push('# Debug Report');
    sections.push('');
    sections.push('## Summary');
    sections.push(report.summary);
    sections.push('');

    // Violations
    if (report.violations.length > 0) {
      sections.push('## Violations');
      report.violations.forEach((v, index) => {
        sections.push(`### ${index + 1}. ${v.violation.message}`);
        sections.push('');
        sections.push('**Explanation:**');
        sections.push(v.explanation);
        sections.push('');
        sections.push('**Impact:**');
        sections.push(v.impact);
        sections.push('');
        sections.push('**How to Fix:**');
        v.howToFix.forEach(step => sections.push(`- ${step}`));
        sections.push('');
      });
    }

    // Suggestions
    if (report.suggestions.length > 0) {
      sections.push('## Fix Suggestions');
      report.suggestions.forEach((s, index) => {
        sections.push(`### ${index + 1}. ${s.description}`);
        sections.push('');
        sections.push(s.explanation);
        if (s.codeSnippet) {
          sections.push('');
          sections.push('```typescript');
          sections.push(s.codeSnippet);
          sections.push('```');
        }
        sections.push('');
      });
    }

    // Examples
    if (report.examples.length > 0) {
      sections.push('## Code Examples');
      report.examples.forEach((ex, index) => {
        sections.push(`### ${index + 1}. ${ex.title}`);
        sections.push('');
        sections.push(ex.description);
        sections.push('');
        sections.push(`\`\`\`${ex.language}`);
        sections.push(ex.code);
        sections.push('```');
        sections.push('');
      });
    }

    // Learnings
    if (report.learnings.length > 0) {
      sections.push('## Key Learnings');
      report.learnings.forEach(learning => sections.push(`- ${learning}`));
      sections.push('');
    }

    // Next Steps
    sections.push('## Next Steps');
    report.nextSteps.forEach(step => sections.push(`- ${step}`));

    return sections.join('\n');
  }
}

/**
 * Global agent debug helper instance
 */
let globalAgentDebugHelper: AgentDebugHelper | undefined;

/**
 * Get global agent debug helper
 */
export function getGlobalAgentDebugHelper(): AgentDebugHelper {
  if (!globalAgentDebugHelper) {
    globalAgentDebugHelper = new AgentDebugHelper();
  }
  return globalAgentDebugHelper;
}

/**
 * Convenience function to generate debug report
 */
export function generateDebugReport(trace: ExecutionTrace): DebugReport {
  return getGlobalAgentDebugHelper().generateReport(trace);
}
