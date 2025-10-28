/**
 * Detectors for internationalization (i18n) analysis
 */

import * as ts from 'typescript';
import type {
  SourceFile,
  HardcodedString,
  MissingTranslation,
  DateTimeIssue,
  NumberFormatIssue,
  RTLSupportIssue
} from '../types';
import { ASTTraversal } from '../analysis/SourceFileParser';

/**
 * Detect hardcoded user-facing strings
 */
export class HardcodedStringDetector {
  /**
   * Find hardcoded strings that should be translated
   */
  detectHardcodedStrings(files: SourceFile[]): HardcodedString[] {
    const hardcoded: HardcodedString[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      const sourceFile = file.ast as ts.SourceFile;

      // Extract all string literals
      const strings = ASTTraversal.extractStringLiterals(sourceFile, sourceFile, true);

      strings.forEach(({ text, line, node }) => {
        // Check if string is wrapped in t() or i18n() function
        const isTranslated = this.isWrappedInTranslationFunction(node);

        if (!isTranslated && this.isUserFacingContext(node)) {
          hardcoded.push({
            filePath: file.path,
            lineNumber: line,
            stringValue: text,
            context: this.getContext(node),
            isUserFacing: true,
            suggestedKey: this.suggestTranslationKey(text)
          });
        }
      });
    });

    return hardcoded;
  }

  /**
   * Check if string is wrapped in translation function
   */
  private isWrappedInTranslationFunction(node: ts.Node): boolean {
    // Check if parent is a call expression to t(), i18n(), $t(), etc.
    if (node.parent && ts.isCallExpression(node.parent)) {
      const { expression } = node.parent;

      if (ts.isIdentifier(expression)) {
        const name = expression.text;
        return (
          name === 't' ||
          name === 'i18n' ||
          name === '$t' ||
          name === 'translate' ||
          name === 'formatMessage'
        );
      }

      // Check for i18n.t() pattern
      if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.name)
      ) {
        const name = expression.name.text;
        return name === 't' || name === 'translate';
      }
    }

    return false;
  }

  /**
   * Check if string is in user-facing context
   */
  private isUserFacingContext(node: ts.Node): boolean {
    // In JSX (user-facing by default)
    if (this.isInJSX(node)) {
      return true;
    }

    // In object with user-facing keys
    if (this.isInUserFacingObject(node)) {
      return true;
    }

    return false;
  }

  /**
   * Check if node is in JSX
   */
  private isInJSX(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (
        ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current) ||
        ts.isJsxExpression(current) ||
        ts.isJsxText(current)
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Check if string is in user-facing object property
   */
  private isInUserFacingObject(node: ts.Node): boolean {
    if (node.parent && ts.isPropertyAssignment(node.parent)) {
      const propertyName = node.parent.name;
      if (ts.isIdentifier(propertyName)) {
        const name = propertyName.text.toLowerCase();
        const userFacingProps = [
          'label',
          'title',
          'description',
          'placeholder',
          'message',
          'text',
          'content',
          'tooltip',
          'error',
          'success',
          'warning'
        ];
        return userFacingProps.includes(name);
      }
    }
    return false;
  }

  /**
   * Get context description
   */
  private getContext(node: ts.Node): string {
    if (this.isInJSX(node)) {
      return 'JSX content';
    }
    if (this.isInUserFacingObject(node)) {
      return 'object property';
    }
    return 'string literal';
  }

  /**
   * Suggest translation key
   */
  private suggestTranslationKey(text: string): string {
    // Convert to snake_case key
    const key = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50); // Limit length

    return key;
  }
}

/**
 * Detect missing translations
 */
export class TranslationCoverageDetector {
  /**
   * Detect missing translations across locales
   * Note: This requires access to translation files
   */
  detectMissingTranslations(
    translationFiles: Record<string, any>
  ): MissingTranslation[] {
    const missing: MissingTranslation[] = [];

    // Get all locales
    const locales = Object.keys(translationFiles);
    if (locales.length === 0) return missing;

    // Get all keys from all locales
    const allKeys = new Set<string>();
    locales.forEach(locale => {
      const keys = this.extractKeys(translationFiles[locale]);
      keys.forEach(key => allKeys.add(key));
    });

    // Check each key in each locale
    allKeys.forEach(key => {
      const missingLocales: string[] = [];

      locales.forEach(locale => {
        if (!this.hasKey(translationFiles[locale], key)) {
          missingLocales.push(locale);
        }
      });

      if (missingLocales.length > 0) {
        missing.push({
          key,
          missingLocales,
          foundIn: locales.find(l => this.hasKey(translationFiles[l], key)) || '',
          priority: missingLocales.length > locales.length / 2 ? 'high' : 'medium'
        });
      }
    });

    return missing;
  }

  /**
   * Extract all keys from translation object
   */
  private extractKeys(obj: any, prefix: string = ''): string[] {
    const keys: string[] = [];

    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Nested object - recurse
        keys.push(...this.extractKeys(obj[key], fullKey));
      } else {
        // Leaf node
        keys.push(fullKey);
      }
    });

    return keys;
  }

  /**
   * Check if translation object has key
   */
  private hasKey(obj: any, key: string): boolean {
    const parts = key.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }

    return true;
  }
}

/**
 * Detect date/time formatting issues
 */
export class DateTimeFormatDetector {
  /**
   * Find date/time operations without locale
   */
  detectDateTimeIssues(files: SourceFile[]): DateTimeIssue[] {
    const issues: DateTimeIssue[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      const sourceFile = file.ast as ts.SourceFile;

      // Find date formatting calls
      ASTTraversal.visit(sourceFile, node => {
        if (ts.isCallExpression(node)) {
          const { expression } = node;

          // Check for Date methods
          if (ts.isPropertyAccessExpression(expression)) {
            const methodName = expression.name.text;

            // toLocaleDateString, toLocaleTimeString without locale param
            if (
              (methodName === 'toLocaleDateString' ||
                methodName === 'toLocaleTimeString' ||
                methodName === 'toLocaleString') &&
              node.arguments.length === 0
            ) {
              issues.push({
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                issueType: 'no-locale',
                code: node.getText(sourceFile).substring(0, 100)
              });
            }

            // toDateString, toTimeString (non-localized)
            if (
              methodName === 'toDateString' ||
              methodName === 'toTimeString' ||
              methodName === 'toString'
            ) {
              issues.push({
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                issueType: 'hardcoded-format',
                code: node.getText(sourceFile).substring(0, 100)
              });
            }
          }
        }
      });
    });

    return issues;
  }
}

/**
 * Detect number formatting issues
 */
export class NumberFormatDetector {
  /**
   * Find number formatting without locale
   */
  detectNumberFormatIssues(files: SourceFile[]): NumberFormatIssue[] {
    const issues: NumberFormatIssue[] = [];

    files.forEach(file => {
      if (!file.ast) return;

      const sourceFile = file.ast as ts.SourceFile;

      // Find number formatting
      ASTTraversal.visit(sourceFile, node => {
        if (ts.isCallExpression(node)) {
          const { expression } = node;

          if (ts.isPropertyAccessExpression(expression)) {
            const methodName = expression.name.text;

            // toFixed, toPrecision without locale formatting
            if (methodName === 'toFixed' || methodName === 'toPrecision') {
              issues.push({
                filePath: file.path,
                lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                issueType: 'no-locale',
                code: node.getText(sourceFile).substring(0, 100)
              });
            }
          }

          // Check for currency symbols in strings
          if (ts.isIdentifier(expression)) {
            const name = expression.text;
            if (name === 'String' || name === 'toString') {
              // Check if combining with currency symbol
              const parent = node.parent;
              if (parent && ts.isBinaryExpression(parent)) {
                const code = parent.getText(sourceFile);
                if (code.includes('$') || code.includes('€') || code.includes('£')) {
                  issues.push({
                    filePath: file.path,
                    lineNumber: ASTTraversal.getLineNumber(parent, sourceFile),
                    issueType: 'currency',
                    code: code.substring(0, 100)
                  });
                }
              }
            }
          }
        }
      });
    });

    return issues;
  }
}

/**
 * Detect RTL (Right-to-Left) support issues
 */
export class RTLSupportDetector {
  /**
   * Find CSS/styling that may break in RTL
   * Note: This is a simplified version - full RTL detection requires CSS parsing
   */
  detectRTLIssues(files: SourceFile[]): RTLSupportIssue[] {
    const issues: RTLSupportIssue[] = [];

    files.forEach(file => {
      // For now, check for common RTL-problematic patterns in JSX
      if (!file.ast || file.language !== 'tsx') return;

      const sourceFile = file.ast as ts.SourceFile;

      // Check for style objects with problematic properties
      ASTTraversal.visit(sourceFile, node => {
        if (ts.isObjectLiteralExpression(node)) {
          node.properties.forEach(prop => {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              const propName = prop.name.text;

              // Check for directional properties that should use logical properties
              if (
                propName === 'marginLeft' ||
                propName === 'marginRight' ||
                propName === 'paddingLeft' ||
                propName === 'paddingRight' ||
                propName === 'left' ||
                propName === 'right' ||
                propName === 'textAlign'
              ) {
                issues.push({
                  filePath: file.path,
                  lineNumber: ASTTraversal.getLineNumber(node, sourceFile),
                  issueType: this.categorizeRTLIssue(propName),
                  property: propName
                });
              }
            }
          });
        }
      });
    });

    return issues;
  }

  /**
   * Categorize RTL issue type
   */
  private categorizeRTLIssue(
    property: string
  ): 'absolute-positioning' | 'text-align' | 'margin-padding' | 'icon-direction' {
    if (property === 'left' || property === 'right') {
      return 'absolute-positioning';
    }
    if (property === 'textAlign') {
      return 'text-align';
    }
    if (
      property.startsWith('margin') ||
      property.startsWith('padding')
    ) {
      return 'margin-padding';
    }
    return 'icon-direction';
  }
}
