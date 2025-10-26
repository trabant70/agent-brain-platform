/**
 * I18nService
 *
 * Handles internationalization (i18n) for webviews.
 * Responsible for:
 * - Detecting VSCode display language
 * - Loading appropriate translation bundles
 * - Fallback to English if translation not available
 * - Sending i18n data to webview
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { logger, LogCategory } from '@agent-brain/core/infrastructure/logging/Logger';

export class I18nService {
  constructor(private extensionUri: vscode.Uri) {}

  /**
   * Send i18n data to webview
   * Loads the appropriate bundle based on VSCode's display language
   */
  sendI18nData(webview: vscode.Webview): void {
    console.log('[I18nService] sendI18nData() called');
    logger.info(LogCategory.EXTENSION, '[I18nService] sendI18nData() called', 'I18nService.sendI18nData');

    // Detect VSCode language
    const locale = this.detectLocale();
    console.log('[I18nService] Detected VSCode language:', locale);
    logger.debug(LogCategory.EXTENSION, `Detected VSCode language: ${locale}`, 'I18nService.sendI18nData');

    // Determine bundle file path
    const bundleFile = this.getBundleFileForLocale(locale);
    console.log('[I18nService] Bundle file to load:', bundleFile);

    // Load and send translations
    const translations = this.loadTranslations(bundleFile);
    console.log('[I18nService] Loaded translations:', translations ? `${Object.keys(translations).length} keys` : 'null');

    if (translations) {
      console.log('[I18nService] Sending translations to webview via postMessage');
      this.sendTranslationsToWebview(webview, locale, translations);
    } else {
      // Fallback to English
      console.log('[I18nService] Translations failed to load, falling back to English');
      this.handleFallback(webview);
    }
  }

  /**
   * Detect VSCode display language
   */
  detectLocale(): string {
    return vscode.env.language || 'en';
  }

  /**
   * Get bundle file name for a given locale
   */
  private getBundleFileForLocale(locale: string): string {
    // Normalize locale: 'zh-cn' -> 'zh-cn', 'en-us' -> 'en', etc.
    const normalizedLocale = locale.toLowerCase();

    // Check if we have a specific translation for this locale
    if (normalizedLocale.startsWith('de')) {
      return 'bundle.l10n.de.json';
    } else if (normalizedLocale.startsWith('es')) {
      return 'bundle.l10n.es.json';
    } else if (normalizedLocale.startsWith('zh-cn') || normalizedLocale === 'zh') {
      return 'bundle.l10n.zh-cn.json';
    } else if (normalizedLocale.startsWith('fr')) {
      return 'bundle.l10n.fr.json';
    }

    // Default to English
    return 'bundle.l10n.json';
  }

  /**
   * Load translations from bundle file
   * Returns null if loading fails
   */
  loadTranslations(bundleFile: string): Record<string, string> | null {
    try {
      const bundlePath = vscode.Uri.joinPath(this.extensionUri, 'l10n', bundleFile);
      const bundleContent = fs.readFileSync(bundlePath.fsPath, 'utf8');
      const translations = JSON.parse(bundleContent);

      logger.info(
        LogCategory.EXTENSION,
        `Loaded i18n bundle: ${bundleFile} (${Object.keys(translations).length} strings)`,
        'I18nService.loadTranslations'
      );

      return translations;
    } catch (error) {
      logger.error(
        LogCategory.EXTENSION,
        `Failed to load i18n bundle: ${bundleFile}`,
        'I18nService.loadTranslations',
        error
      );
      return null;
    }
  }

  /**
   * Handle fallback to English when requested language is not available
   */
  private handleFallback(webview: vscode.Webview): void {
    try {
      const fallbackPath = vscode.Uri.joinPath(this.extensionUri, 'l10n', 'bundle.l10n.json');
      const fallbackContent = fs.readFileSync(fallbackPath.fsPath, 'utf8');
      const fallbackTranslations = JSON.parse(fallbackContent);

      this.sendTranslationsToWebview(webview, 'en', fallbackTranslations);

      logger.info(
        LogCategory.EXTENSION,
        'Falling back to English translations',
        'I18nService.handleFallback'
      );
    } catch (fallbackError) {
      logger.error(
        LogCategory.EXTENSION,
        'Failed to load fallback English bundle',
        'I18nService.handleFallback',
        fallbackError
      );
    }
  }

  /**
   * Send translations to webview
   */
  private sendTranslationsToWebview(
    webview: vscode.Webview,
    locale: string,
    translations: Record<string, string>
  ): void {
    console.log('[I18nService] sendTranslationsToWebview() called with:', {
      locale,
      translationsCount: Object.keys(translations).length,
      sampleKeys: Object.keys(translations).slice(0, 5)
    });

    const message = {
      type: 'i18n:init',
      payload: {
        locale: locale,
        translations: translations
      }
    };

    console.log('[I18nService] Calling webview.postMessage() with type:', message.type);
    webview.postMessage(message);
    console.log('[I18nService] webview.postMessage() completed');

    logger.info(
      LogCategory.EXTENSION,
      `Sent i18n data to webview: ${locale}, ${Object.keys(translations).length} translations`,
      'I18nService.sendTranslationsToWebview'
    );
  }
}
