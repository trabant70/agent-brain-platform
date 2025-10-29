/**
 * Internationalization Registry
 *
 * Stores lightweight metadata for i18n analysis:
 * - String literals (hardcoded user-facing text)
 * - Date/time operations (without locale)
 * - Number formatting (without locale)
 * - RTL support issues
 *
 * Memory efficient: Stores only essential metadata
 */

export interface StringLiteralMetadata {
  text: string;
  filePath: string;
  lineNumber: number;
  isUserFacing: boolean;
  context: 'jsx' | 'object-property' | 'string-literal';
  inJSX: boolean;
  hasTranslation: boolean;
  suggestedKey?: string;
  propertyName?: string;           // If in object property
}

export interface DateTimeOperationMetadata {
  filePath: string;
  lineNumber: number;
  type: 'date' | 'time' | 'datetime';
  functionName?: string;           // Function/method name
  usesLocale: boolean;
  requiresLocalization: boolean;
  isUserFacing: boolean;
  issueType?: 'no-locale' | 'hardcoded-format' | 'missing-timezone';
  method?: string;                 // Method name (e.g., 'toLocaleDateString')
  code?: string;                   // Code snippet
  hasLocaleParam?: boolean;
}

export interface NumberFormatMetadata {
  filePath: string;
  lineNumber: number;
  type: 'number' | 'currency' | 'percentage';
  usesLocale: boolean;
  requiresLocalization: boolean;
  isUserFacing: boolean;
  issueType?: 'no-locale' | 'currency' | 'decimal-separator';
  code?: string;                   // Code snippet
  hasLocaleParam?: boolean;
  isCurrency?: boolean;
}

export interface RTLIssueMetadata {
  filePath: string;
  lineNumber: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issueType: 'directional-property' | 'hardcoded-direction' | 'text-align';
  property: string;                // CSS property name
  propertyName: string;            // Alias for property
  propertyValue?: string;          // Property value
  value?: string;                  // Property value (alias)
  suggestion?: string;             // Fix suggestion
}

/**
 * Registry for internationalization metadata
 */
export class InternationalizationRegistry {
  private stringLiterals: StringLiteralMetadata[] = [];
  private dateTimeOps: DateTimeOperationMetadata[] = [];
  private numberFormats: NumberFormatMetadata[] = [];
  private rtlIssues: RTLIssueMetadata[] = [];

  // ==================== String Literal Operations ====================

  /**
   * Add string literal metadata
   */
  addStringLiteral(literal: StringLiteralMetadata): void {
    this.stringLiterals.push(literal);
  }

  /**
   * Get all string literals
   */
  getAllStringLiterals(): StringLiteralMetadata[] {
    return this.stringLiterals;
  }

  /**
   * Get user-facing strings
   */
  getUserFacingStrings(): StringLiteralMetadata[] {
    return this.stringLiterals.filter(s => s.isUserFacing);
  }

  /**
   * Get untranslated strings
   */
  getUntranslatedStrings(): StringLiteralMetadata[] {
    return this.stringLiterals.filter(s => s.isUserFacing && !s.hasTranslation);
  }

  /**
   * Get translated strings
   */
  getTranslatedStrings(): StringLiteralMetadata[] {
    return this.stringLiterals.filter(s => s.isUserFacing && s.hasTranslation);
  }

  /**
   * Get strings by context
   */
  getStringsByContext(context: StringLiteralMetadata['context']): StringLiteralMetadata[] {
    return this.stringLiterals.filter(s => s.context === context);
  }

  /**
   * Get strings by file
   */
  getStringsByFile(filePath: string): StringLiteralMetadata[] {
    return this.stringLiterals.filter(s => s.filePath === filePath);
  }

  /**
   * Get JSX strings
   */
  getJSXStrings(): StringLiteralMetadata[] {
    return this.stringLiterals.filter(s => s.inJSX);
  }

  // ==================== Date/Time Operations ====================

  /**
   * Add date/time operation metadata
   */
  addDateTimeOperation(operation: DateTimeOperationMetadata): void {
    this.dateTimeOps.push(operation);
  }

  /**
   * Get all date/time operations
   */
  getAllDateTimeOperations(): DateTimeOperationMetadata[] {
    return this.dateTimeOps;
  }

  /**
   * Get date/time operations without locale
   */
  getDateTimeOpsWithoutLocale(): DateTimeOperationMetadata[] {
    return this.dateTimeOps.filter(op => !op.hasLocaleParam);
  }

  /**
   * Get date/time operations by issue type
   */
  getDateTimeOpsByIssueType(issueType: DateTimeOperationMetadata['issueType']): DateTimeOperationMetadata[] {
    return this.dateTimeOps.filter(op => op.issueType === issueType);
  }

  /**
   * Get date/time operations by file
   */
  getDateTimeOpsByFile(filePath: string): DateTimeOperationMetadata[] {
    return this.dateTimeOps.filter(op => op.filePath === filePath);
  }

  // ==================== Number Format Operations ====================

  /**
   * Add number format metadata
   */
  addNumberFormat(format: NumberFormatMetadata): void {
    this.numberFormats.push(format);
  }

  /**
   * Get all number formats
   */
  getAllNumberFormats(): NumberFormatMetadata[] {
    return this.numberFormats;
  }

  /**
   * Get number formats without locale
   */
  getNumberFormatsWithoutLocale(): NumberFormatMetadata[] {
    return this.numberFormats.filter(nf => !nf.hasLocaleParam);
  }

  /**
   * Get currency formatting issues
   */
  getCurrencyFormattingIssues(): NumberFormatMetadata[] {
    return this.numberFormats.filter(nf => nf.isCurrency && !nf.hasLocaleParam);
  }

  /**
   * Get number formats by issue type
   */
  getNumberFormatsByIssueType(issueType: NumberFormatMetadata['issueType']): NumberFormatMetadata[] {
    return this.numberFormats.filter(nf => nf.issueType === issueType);
  }

  /**
   * Get number formats by file
   */
  getNumberFormatsByFile(filePath: string): NumberFormatMetadata[] {
    return this.numberFormats.filter(nf => nf.filePath === filePath);
  }

  // ==================== RTL Support Operations ====================

  /**
   * Add RTL issue metadata
   */
  addRTLIssue(issue: RTLIssueMetadata): void {
    this.rtlIssues.push(issue);
  }

  /**
   * Get all RTL issues
   */
  getAllRTLIssues(): RTLIssueMetadata[] {
    return this.rtlIssues;
  }

  /**
   * Get RTL issues by type
   */
  getRTLIssuesByType(issueType: RTLIssueMetadata['issueType']): RTLIssueMetadata[] {
    return this.rtlIssues.filter(i => i.issueType === issueType);
  }

  /**
   * Get directional property issues
   */
  getDirectionalPropertyIssues(): RTLIssueMetadata[] {
    return this.rtlIssues.filter(i => i.issueType === 'directional-property');
  }

  /**
   * Get RTL issues by file
   */
  getRTLIssuesByFile(filePath: string): RTLIssueMetadata[] {
    return this.rtlIssues.filter(i => i.filePath === filePath);
  }

  // ==================== Statistics ====================

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const userFacingStrings = this.getUserFacingStrings();
    const untranslatedStrings = this.getUntranslatedStrings();

    return {
      stringLiterals: {
        total: this.stringLiterals.length,
        userFacing: userFacingStrings.length,
        untranslated: untranslatedStrings.length,
        translated: this.getTranslatedStrings().length,
        translationCoverage: userFacingStrings.length > 0
          ? Math.round((this.getTranslatedStrings().length / userFacingStrings.length) * 100)
          : 100,
        byContext: {
          jsx: this.getStringsByContext('jsx').length,
          objectProperty: this.getStringsByContext('object-property').length,
          stringLiteral: this.getStringsByContext('string-literal').length
        },
        inJSX: this.getJSXStrings().length
      },
      dateTime: {
        total: this.dateTimeOps.length,
        withoutLocale: this.getDateTimeOpsWithoutLocale().length,
        byIssueType: {
          noLocale: this.getDateTimeOpsByIssueType('no-locale').length,
          hardcodedFormat: this.getDateTimeOpsByIssueType('hardcoded-format').length,
          missingTimezone: this.getDateTimeOpsByIssueType('missing-timezone').length
        }
      },
      numberFormat: {
        total: this.numberFormats.length,
        withoutLocale: this.getNumberFormatsWithoutLocale().length,
        currency: this.getCurrencyFormattingIssues().length,
        byIssueType: {
          noLocale: this.getNumberFormatsByIssueType('no-locale').length,
          currency: this.getNumberFormatsByIssueType('currency').length,
          decimalSeparator: this.getNumberFormatsByIssueType('decimal-separator').length
        }
      },
      rtl: {
        total: this.rtlIssues.length,
        directionalProperties: this.getDirectionalPropertyIssues().length,
        byIssueType: {
          directionalProperty: this.getRTLIssuesByType('directional-property').length,
          hardcodedDirection: this.getRTLIssuesByType('hardcoded-direction').length,
          textAlign: this.getRTLIssuesByType('text-align').length
        }
      },
      overallI18nReadiness: this.calculateI18nReadiness()
    };
  }

  /**
   * Calculate overall i18n readiness score
   */
  private calculateI18nReadiness(): number {
    const userFacingStrings = this.getUserFacingStrings();
    const untranslatedStrings = this.getUntranslatedStrings();

    let score = 100;

    // Untranslated strings are the biggest issue
    const untranslatedPenalty = userFacingStrings.length > 0
      ? (untranslatedStrings.length / userFacingStrings.length) * 50
      : 0;
    score -= untranslatedPenalty;

    // Date/time issues
    score -= Math.min(this.getDateTimeOpsWithoutLocale().length * 2, 20);

    // Number format issues
    score -= Math.min(this.getNumberFormatsWithoutLocale().length * 2, 20);

    // RTL issues (lower priority)
    score -= Math.min(this.rtlIssues.length * 1, 10);

    return Math.max(0, Math.round(score));
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): {
    stringLiterals: number;
    dateTimeOps: number;
    numberFormats: number;
    rtlIssues: number;
    totalKB: number;
  } {
    // Rough estimates: each metadata object is ~100-200 bytes
    const stringBytes = this.stringLiterals.length * 150;
    const dateTimeBytes = this.dateTimeOps.length * 150;
    const numberBytes = this.numberFormats.length * 130;
    const rtlBytes = this.rtlIssues.length * 120;

    const totalBytes = stringBytes + dateTimeBytes + numberBytes + rtlBytes;

    return {
      stringLiterals: this.stringLiterals.length,
      dateTimeOps: this.dateTimeOps.length,
      numberFormats: this.numberFormats.length,
      rtlIssues: this.rtlIssues.length,
      totalKB: Math.round(totalBytes / 1024)
    };
  }

  /**
   * Clear all registries
   */
  clear(): void {
    this.stringLiterals = [];
    this.dateTimeOps = [];
    this.numberFormats = [];
    this.rtlIssues = [];
  }

  /**
   * Get item counts
   */
  getCounts() {
    return {
      stringLiterals: this.stringLiterals.length,
      dateTimeOps: this.dateTimeOps.length,
      numberFormats: this.numberFormats.length,
      rtlIssues: this.rtlIssues.length,
      untranslated: this.getUntranslatedStrings().length
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Suggest translation key from text
   */
  static suggestTranslationKey(text: string): string {
    // Convert to snake_case key
    const key = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50); // Limit length

    return key || 'translation_key';
  }

  /**
   * Check if string is likely user-facing
   */
  static isLikelyUserFacing(text: string): boolean {
    // Filter out very short strings
    if (text.length <= 2) return false;

    // Filter out all-uppercase (likely constants)
    if (text === text.toUpperCase()) return false;

    // Filter out technical identifiers
    if (/^[a-z_][a-z0-9_]*$/i.test(text)) return false;

    // Likely user-facing if it contains spaces or is long
    return /\s/.test(text) || text.length > 10;
  }

  /**
   * Detect directional CSS properties
   */
  static isDirectionalProperty(property: string): boolean {
    const directional = [
      'marginLeft', 'marginRight',
      'paddingLeft', 'paddingRight',
      'left', 'right',
      'borderLeft', 'borderRight',
      'borderLeftWidth', 'borderRightWidth',
      'borderLeftColor', 'borderRightColor',
      'borderLeftStyle', 'borderRightStyle',
      'borderTopLeftRadius', 'borderTopRightRadius',
      'borderBottomLeftRadius', 'borderBottomRightRadius'
    ];

    return directional.includes(property);
  }

  /**
   * Suggest logical property alternative
   */
  static suggestLogicalProperty(property: string): string {
    const mapping: Record<string, string> = {
      'marginLeft': 'marginInlineStart',
      'marginRight': 'marginInlineEnd',
      'paddingLeft': 'paddingInlineStart',
      'paddingRight': 'paddingInlineEnd',
      'left': 'insetInlineStart',
      'right': 'insetInlineEnd',
      'borderLeft': 'borderInlineStart',
      'borderRight': 'borderInlineEnd',
      'textAlign': 'Use "start" or "end" instead of "left" or "right"'
    };

    return mapping[property] || property;
  }
}
