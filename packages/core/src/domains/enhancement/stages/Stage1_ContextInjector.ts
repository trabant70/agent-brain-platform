/**
 * Stage 1: Pure Context Injection
 *
 * The honest baseline: We just add context we already have.
 * No intelligence, no pretense, just mechanical concatenation.
 *
 * This is the minimum viable enhancement.
 */

import { EnhancementContext } from '../types';

export class Stage1_ContextInjector {
  /**
   * Enhance prompt by adding available context
   * Pure mechanical operation - no intelligence required
   */
  enhance(prompt: string, context: EnhancementContext): string {
    const parts = [prompt];

    // Add current file if we have it
    if (context.currentFile) {
      parts.push(`\nCurrent file: ${context.currentFile}`);
    }

    // Add recent errors if any
    if (context.recentErrors && context.recentErrors.length > 0) {
      parts.push(`\nRecent errors:\n${context.recentErrors.join('\n')}`);
    }

    // Add test failures if any
    if (context.testFailures && context.testFailures.length > 0) {
      parts.push(`\nFailing tests: ${context.testFailures.join(', ')}`);
    }

    return parts.join('\n');
  }
}
