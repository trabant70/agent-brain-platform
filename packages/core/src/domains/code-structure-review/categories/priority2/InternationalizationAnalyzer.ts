/**
 * Internationalization (i18n) Analyzer
 *
 * Detects:
 * - Hardcoded user-facing strings
 * - Missing translations across locales
 * - Date/time formatting without locale
 * - Number/currency formatting without locale
 * - RTL (Right-to-Left) support issues
 */

import type {
  CategoryAnalysis,
  AnalysisContext,
  Issue,
  CategoryConfig,
  I18nAnalysisResult
} from '../../types';
import { AnalysisCategory } from '../base/AnalysisCategory';
import { CATEGORY_IDS, CATEGORY_METADATA, CategoryPriority } from '../base/CategoryTypes';
import {
  HardcodedStringDetector,
  TranslationCoverageDetector,
  DateTimeFormatDetector,
  NumberFormatDetector,
  RTLSupportDetector
} from '../../detectors/I18nDetectors';
import { AnalysisContextUtils } from '../../analysis/AnalysisContext';

/**
 * Analyzes internationalization readiness
 */
export class InternationalizationAnalyzer extends AnalysisCategory {
  private hardcodedStringDetector: HardcodedStringDetector;
  private translationCoverageDetector: TranslationCoverageDetector;
  private dateTimeFormatDetector: DateTimeFormatDetector;
  private numberFormatDetector: NumberFormatDetector;
  private rtlSupportDetector: RTLSupportDetector;

  constructor(config?: Partial<CategoryConfig>) {
    const metadata = CATEGORY_METADATA[CATEGORY_IDS.INTERNATIONALIZATION];

    super({
      id: metadata.id,
      name: metadata.name,
      icon: metadata.icon,
      description: metadata.description,
      priority: CategoryPriority.HIGH,
      enabled: true,
      thresholds: {
        excellent: 95,
        good: 80,
        warning: 60,
        critical: 0
      },
      ...config
    });

    this.hardcodedStringDetector = new HardcodedStringDetector();
    this.translationCoverageDetector = new TranslationCoverageDetector();
    this.dateTimeFormatDetector = new DateTimeFormatDetector();
    this.numberFormatDetector = new NumberFormatDetector();
    this.rtlSupportDetector = new RTLSupportDetector();
  }

  /**
   * Run i18n analysis
   */
  async analyze(context: AnalysisContext): Promise<CategoryAnalysis> {
    const issues: Issue[] = [];
    const metrics: Record<string, number> = {};

    const contextUtils = new AnalysisContextUtils(context);
    const codeFiles = contextUtils.getCodeFiles();

    // Filter to frontend files (where i18n matters most)
    const frontendFiles = codeFiles.filter(
      file =>
        file.language === 'tsx' ||
        file.language === 'jsx' ||
        file.path.includes('/components/') ||
        file.path.includes('/pages/')
    );

    if (frontendFiles.length === 0) {
      return this.createAnalysisResult([], {
        totalFiles: 0
      });
    }

    // Detect hardcoded strings
    const hardcodedStrings = this.hardcodedStringDetector.detectHardcodedStrings(
      frontendFiles
    );

    // Detect date/time formatting issues
    const dateTimeIssues = this.dateTimeFormatDetector.detectDateTimeIssues(codeFiles);

    // Detect number formatting issues
    const numberFormatIssues = this.numberFormatDetector.detectNumberFormatIssues(
      codeFiles
    );

    // Detect RTL support issues
    const rtlIssues = this.rtlSupportDetector.detectRTLIssues(frontendFiles);

    // Create issues for hardcoded strings
    hardcodedStrings.forEach(hardcoded => {
      issues.push(
        this.createIssue({
          id: `i18n-hardcoded-${hardcoded.filePath}-${hardcoded.lineNumber}`,
          severity: 'high',
          title: `Hardcoded string: "${this.truncateString(hardcoded.stringValue)}"`,
          description: `User-facing string is hardcoded and not translatable. Context: ${hardcoded.context}`,
          filePath: hardcoded.filePath,
          lineNumber: hardcoded.lineNumber,
          detectorId: 'hardcoded-string-detector',
          fixSuggestion: `Replace with translation: t('${hardcoded.suggestedKey}')`,
          aiPromptHint: `Help me extract this hardcoded string to a translation file. Suggested key: ${hardcoded.suggestedKey}`
        })
      );
    });

    // Create issues for date/time formatting
    dateTimeIssues.forEach(dateIssue => {
      const severity = dateIssue.issueType === 'hardcoded-format' ? 'high' : 'medium';

      issues.push(
        this.createIssue({
          id: `i18n-datetime-${dateIssue.filePath}-${dateIssue.lineNumber}`,
          severity,
          title: `Date/time ${this.formatDateTimeIssueType(dateIssue.issueType)}`,
          description: `Date/time formatting without locale consideration. This will display incorrectly in different regions.`,
          filePath: dateIssue.filePath,
          lineNumber: dateIssue.lineNumber,
          detectorId: 'datetime-format-detector',
          fixSuggestion: this.getDateTimeFixSuggestion(dateIssue.issueType),
          aiPromptHint: `Help me add locale-aware date/time formatting for: ${dateIssue.code}`
        })
      );
    });

    // Create issues for number formatting
    numberFormatIssues.forEach(numberIssue => {
      const severity = numberIssue.issueType === 'currency' ? 'high' : 'medium';

      issues.push(
        this.createIssue({
          id: `i18n-number-${numberIssue.filePath}-${numberIssue.lineNumber}`,
          severity,
          title: `Number ${this.formatNumberIssueType(numberIssue.issueType)}`,
          description: `Number formatting without locale. Decimal separators and currency symbols vary by region.`,
          filePath: numberIssue.filePath,
          lineNumber: numberIssue.lineNumber,
          detectorId: 'number-format-detector',
          fixSuggestion: this.getNumberFormatFixSuggestion(numberIssue.issueType),
          aiPromptHint: `Help me add locale-aware number formatting for: ${numberIssue.code}`
        })
      );
    });

    // Create issues for RTL support
    rtlIssues.forEach(rtlIssue => {
      issues.push(
        this.createIssue({
          id: `i18n-rtl-${rtlIssue.filePath}-${rtlIssue.lineNumber}`,
          severity: 'low',
          title: `RTL issue: ${rtlIssue.property}`,
          description: `Style property may not work correctly in right-to-left languages. Issue type: ${rtlIssue.issueType}`,
          filePath: rtlIssue.filePath,
          lineNumber: rtlIssue.lineNumber,
          detectorId: 'rtl-support-detector',
          fixSuggestion: this.getRTLFixSuggestion(rtlIssue.property),
          aiPromptHint: `Help me make this style RTL-compatible: ${rtlIssue.property}`
        })
      );
    });

    // Calculate metrics
    metrics.totalFrontendFiles = frontendFiles.length;
    metrics.hardcodedStrings = hardcodedStrings.length;
    metrics.dateTimeIssues = dateTimeIssues.length;
    metrics.numberFormatIssues = numberFormatIssues.length;
    metrics.rtlIssues = rtlIssues.length;

    // Calculate i18n readiness score
    const totalStrings = this.estimateTotalStrings(frontendFiles);
    metrics.i18nCoverage =
      totalStrings > 0
        ? Math.round(((totalStrings - hardcodedStrings.length) / totalStrings) * 100)
        : 100;

    metrics.i18nReadinessScore = this.calculateI18nReadiness(
      hardcodedStrings.length,
      dateTimeIssues.length,
      numberFormatIssues.length,
      rtlIssues.length
    );

    // Create analysis result
    return this.createAnalysisResult(issues, metrics);
  }

  /**
   * Estimate total user-facing strings (rough heuristic)
   */
  private estimateTotalStrings(files: any[]): number {
    // Rough estimate: 10 strings per component file, 5 per page
    let estimate = 0;
    files.forEach(file => {
      if (file.path.includes('/components/')) {
        estimate += 10;
      } else if (file.path.includes('/pages/')) {
        estimate += 5;
      }
    });
    return Math.max(estimate, 1);
  }

  /**
   * Calculate i18n readiness score
   */
  private calculateI18nReadiness(
    hardcoded: number,
    datetime: number,
    number: number,
    rtl: number
  ): number {
    let score = 100;

    // Hardcoded strings are the biggest issue
    score -= hardcoded * 5;

    // Date/time and number formatting issues
    score -= datetime * 3;
    score -= number * 3;

    // RTL issues are lower priority
    score -= rtl * 1;

    return Math.max(0, Math.round(score));
  }

  /**
   * Truncate string for display
   */
  private truncateString(str: string, maxLength: number = 50): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }

  /**
   * Format date/time issue type
   */
  private formatDateTimeIssueType(issueType: string): string {
    const formatted: Record<string, string> = {
      'no-locale': 'formatting without locale',
      'hardcoded-format': 'using non-localized method',
      'missing-timezone': 'missing timezone consideration'
    };
    return formatted[issueType] || issueType;
  }

  /**
   * Get date/time fix suggestion
   */
  private getDateTimeFixSuggestion(issueType: string): string {
    const suggestions: Record<string, string> = {
      'no-locale':
        'Use: date.toLocaleDateString(locale) or date.toLocaleString(locale, options)',
      'hardcoded-format':
        'Replace with: date.toLocaleDateString(locale, { dateStyle: "medium" })',
      'missing-timezone': 'Use: date.toLocaleString(locale, { timeZone: userTimezone })'
    };
    return (
      suggestions[issueType] ||
      'Use Intl.DateTimeFormat for locale-aware date formatting'
    );
  }

  /**
   * Format number issue type
   */
  private formatNumberIssueType(issueType: string): string {
    const formatted: Record<string, string> = {
      'no-locale': 'formatting without locale',
      'currency': 'hardcoded currency symbol',
      'decimal-separator': 'hardcoded decimal separator'
    };
    return formatted[issueType] || issueType;
  }

  /**
   * Get number format fix suggestion
   */
  private getNumberFormatFixSuggestion(issueType: string): string {
    const suggestions: Record<string, string> = {
      'no-locale':
        'Use: number.toLocaleString(locale) or Intl.NumberFormat(locale).format(number)',
      'currency':
        'Use: new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount)',
      'decimal-separator':
        'Use: Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(number)'
    };
    return (
      suggestions[issueType] ||
      'Use Intl.NumberFormat for locale-aware number formatting'
    );
  }

  /**
   * Get RTL fix suggestion
   */
  private getRTLFixSuggestion(property: string): string {
    const suggestions: Record<string, string> = {
      marginLeft: 'Use CSS logical property: marginInlineStart',
      marginRight: 'Use CSS logical property: marginInlineEnd',
      paddingLeft: 'Use CSS logical property: paddingInlineStart',
      paddingRight: 'Use CSS logical property: paddingInlineEnd',
      left: 'Use CSS logical property: insetInlineStart',
      right: 'Use CSS logical property: insetInlineEnd',
      textAlign: 'Use textAlign: "start" or "end" instead of "left" or "right"'
    };
    return (
      suggestions[property] ||
      'Use CSS logical properties for better RTL support'
    );
  }

  /**
   * Custom scoring that emphasizes hardcoded strings
   */
  calculateScore(issues: Issue[]): number {
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');
    const lowIssues = issues.filter(i => i.severity === 'low');

    // Start at 100
    let score = 100;

    // Hardcoded strings are critical for i18n
    score -= highIssues.length * 5;

    // Date/number formatting issues
    score -= mediumIssues.length * 3;

    // RTL issues are lower priority
    score -= lowIssues.length * 1;

    return Math.max(0, Math.round(score));
  }
}
