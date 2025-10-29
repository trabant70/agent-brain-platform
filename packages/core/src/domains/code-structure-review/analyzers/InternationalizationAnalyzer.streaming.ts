/**
 * Internationalization Analyzer (Streaming Version)
 *
 * Analyzes i18n readiness using pre-populated metadata registries.
 * No AST traversal needed - all metadata already extracted.
 *
 * Detects:
 * - Hardcoded user-facing strings (not translated)
 * - Date/time operations without locale support
 * - Number formatting without locale support
 * - RTL (right-to-left) layout issues
 * - Missing translation keys
 */

import type { UnifiedMetadataRegistry } from '../registries/UnifiedMetadataRegistry';
import type {
  StringLiteralMetadata,
  DateTimeOperationMetadata,
  NumberFormatMetadata,
  RTLIssueMetadata
} from '../registries/InternationalizationRegistry';

export interface I18nIssue {
  type: 'untranslated-string' | 'hardcoded-date' | 'hardcoded-number' | 'rtl-issue';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  filePath: string;
  lineNumber?: number;
  metadata?: any;
}

export interface I18nAnalysis {
  categoryId: string;
  categoryName: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  priority: number;
  issues: I18nIssue[];
  metrics: {
    totalStrings: number;
    translatedStrings: number;
    untranslatedStrings: number;
    totalDateTimeOps: number;
    localizableDateTimeOps: number;
    hardcodedDateTimeOps: number;
    totalNumberFormats: number;
    localizableNumberFormats: number;
    hardcodedNumberFormats: number;
    totalRTLIssues: number;
    translationCoverage: number;
    dateTimeCoverage: number;
    numberFormatCoverage: number;
    overallI18nReadiness: number;
  };
  summary: string;
}

/**
 * Internationalization Analyzer using streaming architecture
 */
export class InternationalizationAnalyzerStreaming {
  private registry: UnifiedMetadataRegistry;

  constructor(registry: UnifiedMetadataRegistry) {
    this.registry = registry;
  }

  /**
   * Run analysis using registry data
   */
  analyze(): I18nAnalysis {
    console.log('[I18nAnalyzer] Starting analysis from registries');
    const startTime = Date.now();

    const issues: I18nIssue[] = [];

    // Get all metadata from registries
    const strings = this.registry.i18n.getAllStringLiterals();
    const dateTimeOps = this.registry.i18n.getAllDateTimeOperations();
    const numberFormats = this.registry.i18n.getAllNumberFormats();
    const rtlIssues = this.registry.i18n.getAllRTLIssues();

    console.log(`[I18nAnalyzer] Loaded: ${strings.length} strings, ${dateTimeOps.length} date/time ops, ${numberFormats.length} number formats, ${rtlIssues.length} RTL issues`);

    // Analyze string literals
    const untranslatedStrings = strings.filter(str => str.isUserFacing && !str.hasTranslation);
    issues.push(...this.createUntranslatedStringIssues(untranslatedStrings));

    // Analyze date/time operations
    const hardcodedDateTimeOps = dateTimeOps.filter(op => !op.usesLocale && op.requiresLocalization);
    issues.push(...this.createHardcodedDateTimeIssues(hardcodedDateTimeOps));

    // Analyze number formatting
    const hardcodedNumberFormats = numberFormats.filter(fmt => !fmt.usesLocale && fmt.requiresLocalization);
    issues.push(...this.createHardcodedNumberIssues(hardcodedNumberFormats));

    // RTL issues
    issues.push(...this.createRTLIssues(rtlIssues));

    // Calculate metrics
    const translatedStrings = strings.filter(str => str.hasTranslation || !str.isUserFacing);
    const translationCoverage = strings.length > 0
      ? Math.round((translatedStrings.length / strings.length) * 100)
      : 100;

    const localizableDateTimeOps = dateTimeOps.filter(op => op.usesLocale);
    const dateTimeCoverage = dateTimeOps.length > 0
      ? Math.round((localizableDateTimeOps.length / dateTimeOps.length) * 100)
      : 100;

    const localizableNumberFormats = numberFormats.filter(fmt => fmt.usesLocale);
    const numberFormatCoverage = numberFormats.length > 0
      ? Math.round((localizableNumberFormats.length / numberFormats.length) * 100)
      : 100;

    const overallI18nReadiness = Math.round(
      (translationCoverage * 0.5 + dateTimeCoverage * 0.25 + numberFormatCoverage * 0.25)
    );

    const metrics = {
      totalStrings: strings.length,
      translatedStrings: translatedStrings.length,
      untranslatedStrings: untranslatedStrings.length,
      totalDateTimeOps: dateTimeOps.length,
      localizableDateTimeOps: localizableDateTimeOps.length,
      hardcodedDateTimeOps: hardcodedDateTimeOps.length,
      totalNumberFormats: numberFormats.length,
      localizableNumberFormats: localizableNumberFormats.length,
      hardcodedNumberFormats: hardcodedNumberFormats.length,
      totalRTLIssues: rtlIssues.length,
      translationCoverage,
      dateTimeCoverage,
      numberFormatCoverage,
      overallI18nReadiness
    };

    // Calculate score
    const score = this.calculateScore(metrics);
    const status = this.getStatus(score);

    const duration = Date.now() - startTime;
    console.log(`[I18nAnalyzer] ✓ Analysis complete: ${issues.length} issues found, i18n readiness: ${overallI18nReadiness}%, score: ${score}/100 in ${duration}ms`);

    return {
      categoryId: 'internationalization',
      categoryName: 'Internationalization',
      score,
      status,
      priority: 2,
      issues,
      metrics,
      summary: this.generateSummary(metrics, issues.length)
    };
  }

  /**
   * Create issues for untranslated strings
   */
  private createUntranslatedStringIssues(strings: StringLiteralMetadata[]): I18nIssue[] {
    return strings.map(str => {
      // Determine severity based on context
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (str.inJSX) {
        severity = 'high'; // User-visible UI text
      } else if (str.context === 'object-property') {
        severity = 'medium'; // Configuration or API responses
      }

      return {
        type: 'untranslated-string',
        severity,
        title: `Untranslated string: "${this.truncateString(str.text)}"`,
        description: `String literal "${this.truncateString(str.text)}" in ${str.context} is not translated. This will not adapt to user's locale.`,
        recommendation: str.suggestedKey
          ? `Use translation key: ${str.suggestedKey}`
          : 'Extract this string to a translation file with appropriate key.',
        filePath: str.filePath,
        lineNumber: str.lineNumber,
        metadata: str
      };
    });
  }

  /**
   * Create issues for hardcoded date/time operations
   */
  private createHardcodedDateTimeIssues(dateTimeOps: DateTimeOperationMetadata[]): I18nIssue[] {
    return dateTimeOps.map(op => ({
      type: 'hardcoded-date',
      severity: op.isUserFacing ? 'high' : 'medium',
      title: `Hardcoded date/time: ${op.type}`,
      description: `Date/time operation (${op.type}) does not use locale. Dates will display in default format regardless of user's locale.`,
      recommendation: op.functionName === 'toLocaleDateString' || op.functionName === 'toLocaleTimeString'
        ? 'Already using locale-aware function. Consider passing locale explicitly.'
        : 'Use Intl.DateTimeFormat or date-fns with locale support.',
      filePath: op.filePath,
      lineNumber: op.lineNumber,
      metadata: op
    }));
  }

  /**
   * Create issues for hardcoded number formatting
   */
  private createHardcodedNumberIssues(numberFormats: NumberFormatMetadata[]): I18nIssue[] {
    return numberFormats.map(fmt => ({
      type: 'hardcoded-number',
      severity: fmt.isUserFacing ? 'medium' : 'low',
      title: `Hardcoded number format: ${fmt.type}`,
      description: `Number formatting (${fmt.type}) does not use locale. Numbers will display in default format (e.g., 1,000.00 vs 1.000,00).`,
      recommendation: 'Use Intl.NumberFormat for locale-aware number formatting.',
      filePath: fmt.filePath,
      lineNumber: fmt.lineNumber,
      metadata: fmt
    }));
  }

  /**
   * Create RTL layout issues
   */
  private createRTLIssues(rtlIssues: RTLIssueMetadata[]): I18nIssue[] {
    return rtlIssues.map(issue => ({
      type: 'rtl-issue',
      severity: issue.severity,
      title: `RTL issue: ${issue.propertyName}`,
      description: `CSS property "${issue.propertyName}" may not work correctly in RTL (right-to-left) layouts. Current value: ${issue.propertyValue}.`,
      recommendation: issue.suggestion || 'Use logical properties (e.g., margin-inline-start instead of margin-left) or add RTL-specific styles.',
      filePath: issue.filePath,
      lineNumber: issue.lineNumber,
      metadata: issue
    }));
  }

  /**
   * Truncate string for display
   */
  private truncateString(str: string, maxLength: number = 50): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }

  /**
   * Calculate overall score
   */
  private calculateScore(metrics: I18nAnalysis['metrics']): number {
    // Weight different factors
    const translationScore = metrics.translationCoverage * 0.5; // 50% weight
    const dateTimeScore = metrics.dateTimeCoverage * 0.25; // 25% weight
    const numberFormatScore = metrics.numberFormatCoverage * 0.25; // 25% weight

    // RTL penalty
    const rtlPenalty = Math.min(metrics.totalRTLIssues * 2, 10); // Up to -10 points

    const rawScore = translationScore + dateTimeScore + numberFormatScore - rtlPenalty;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  /**
   * Get status based on score
   */
  private getStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Generate summary text
   */
  private generateSummary(metrics: I18nAnalysis['metrics'], issueCount: number): string {
    const parts: string[] = [];

    parts.push(`Internationalization readiness: ${metrics.overallI18nReadiness}%.`);

    if (metrics.untranslatedStrings > 0) {
      parts.push(`${metrics.untranslatedStrings} strings need translation.`);
    }

    if (metrics.hardcodedDateTimeOps > 0) {
      parts.push(`${metrics.hardcodedDateTimeOps} date/time operations lack locale support.`);
    }

    if (metrics.hardcodedNumberFormats > 0) {
      parts.push(`${metrics.hardcodedNumberFormats} number formats lack locale support.`);
    }

    if (metrics.totalRTLIssues > 0) {
      parts.push(`${metrics.totalRTLIssues} RTL layout issues found.`);
    }

    if (metrics.overallI18nReadiness >= 90) {
      return `Excellent i18n support! ${parts.join(' ')}`;
    }

    if (issueCount === 0) {
      return 'Application is fully internationalized.';
    }

    return parts.join(' ');
  }
}
