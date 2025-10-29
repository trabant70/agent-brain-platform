/**
 * I18n Data Builder
 * Transforms internationalization data into geographic visualization format
 *
 * Input: Translation files and locale configurations
 * Output: Geographic coverage data by locale/region
 */

import { I18nGeographicData, LocaleCoverage } from '../../visualization/webview/visualizations/I18nGeographicHeatmap';

export interface TranslationFile {
  locale: string;
  keys: Record<string, string>;
}

export interface LocaleMetadata {
  locale: string;
  language: string;
  region: string;
  countryCode: string;
}

export class I18nDataBuilder {
  /**
   * Build geographic coverage data from translation files
   */
  static buildFromTranslations(
    translations: TranslationFile[],
    metadata: LocaleMetadata[],
    defaultLocale: string = 'en'
  ): I18nGeographicData {
    // Find default locale to get total key count
    const defaultTranslation = translations.find(t => t.locale === defaultLocale);
    if (!defaultTranslation) {
      console.warn(`Default locale ${defaultLocale} not found`);
      return this.buildSampleData();
    }

    const totalKeys = Object.keys(defaultTranslation.keys).length;
    const defaultKeys = new Set(Object.keys(defaultTranslation.keys));

    // Build coverage for each locale
    const locales: LocaleCoverage[] = translations
      .filter(t => t.locale !== defaultLocale) // Exclude default
      .map(translation => {
        const meta = metadata.find(m => m.locale === translation.locale);
        if (!meta) {
          console.warn(`Metadata not found for locale ${translation.locale}`);
          return null;
        }

        const translationKeys = Object.keys(translation.keys);
        const translatedKeys = translationKeys.filter(key =>
          translation.keys[key] && translation.keys[key].trim() !== ''
        ).length;

        // Find missing keys
        const missingKeys = Array.from(defaultKeys).filter(key =>
          !translation.keys[key] || translation.keys[key].trim() === ''
        );

        const coverage = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;

        return {
          locale: meta.locale,
          language: meta.language,
          region: meta.region,
          countryCode: meta.countryCode,
          totalKeys,
          translatedKeys,
          coverage,
          missingKeys
        };
      })
      .filter((locale): locale is LocaleCoverage => locale !== null);

    // Calculate average coverage
    const averageCoverage = locales.length > 0
      ? locales.reduce((sum, l) => sum + l.coverage, 0) / locales.length
      : 0;

    return {
      locales,
      defaultLocale,
      totalKeys,
      averageCoverage
    };
  }

  /**
   * Build from analysis results
   */
  static buildFromAnalysis(analysis: any): I18nGeographicData {
    const i18nData = analysis?.metrics?.i18n || analysis?.i18n;
    if (!i18nData) {
      return this.buildSampleData();
    }

    const locales: LocaleCoverage[] = (i18nData.locales || []).map((locale: any) => ({
      locale: locale.code,
      language: locale.language,
      region: locale.region,
      countryCode: locale.countryCode,
      totalKeys: locale.totalKeys,
      translatedKeys: locale.translatedKeys,
      coverage: locale.coverage,
      missingKeys: locale.missingKeys || []
    }));

    return {
      locales,
      defaultLocale: i18nData.defaultLocale || 'en',
      totalKeys: i18nData.totalKeys || 0,
      averageCoverage: i18nData.averageCoverage || 0
    };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): I18nGeographicData {
    const locales: LocaleCoverage[] = [
      // Europe
      {
        locale: 'de-DE',
        language: 'German',
        region: 'Germany',
        countryCode: 'DE',
        totalKeys: 450,
        translatedKeys: 445,
        coverage: 98.9,
        missingKeys: ['menu.advanced.settings', 'error.network.timeout']
      },
      {
        locale: 'fr-FR',
        language: 'French',
        region: 'France',
        countryCode: 'FR',
        totalKeys: 450,
        translatedKeys: 432,
        coverage: 96.0,
        missingKeys: ['menu.advanced.settings', 'error.network.timeout', 'tooltip.search.filter']
      },
      {
        locale: 'es-ES',
        language: 'Spanish',
        region: 'Spain',
        countryCode: 'ES',
        totalKeys: 450,
        translatedKeys: 405,
        coverage: 90.0,
        missingKeys: ['menu.advanced.settings', 'error.network.timeout', 'tooltip.search.filter', 'dialog.confirm.delete']
      },
      {
        locale: 'it-IT',
        language: 'Italian',
        region: 'Italy',
        countryCode: 'IT',
        totalKeys: 450,
        translatedKeys: 360,
        coverage: 80.0,
        missingKeys: ['menu.advanced.settings', 'error.network.timeout', 'tooltip.search.filter', 'dialog.confirm.delete', 'settings.theme.custom']
      },
      {
        locale: 'pl-PL',
        language: 'Polish',
        region: 'Poland',
        countryCode: 'PL',
        totalKeys: 450,
        translatedKeys: 315,
        coverage: 70.0,
        missingKeys: Array(10).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'nl-NL',
        language: 'Dutch',
        region: 'Netherlands',
        countryCode: 'NL',
        totalKeys: 450,
        translatedKeys: 387,
        coverage: 86.0,
        missingKeys: Array(5).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'sv-SE',
        language: 'Swedish',
        region: 'Sweden',
        countryCode: 'SE',
        totalKeys: 450,
        translatedKeys: 342,
        coverage: 76.0,
        missingKeys: Array(8).fill('key').map((k, i) => `${k}.${i}`)
      },

      // Asia
      {
        locale: 'zh-CN',
        language: 'Chinese (Simplified)',
        region: 'China',
        countryCode: 'CN',
        totalKeys: 450,
        translatedKeys: 450,
        coverage: 100.0,
        missingKeys: []
      },
      {
        locale: 'ja-JP',
        language: 'Japanese',
        region: 'Japan',
        countryCode: 'JP',
        totalKeys: 450,
        translatedKeys: 441,
        coverage: 98.0,
        missingKeys: ['menu.advanced.settings']
      },
      {
        locale: 'ko-KR',
        language: 'Korean',
        region: 'South Korea',
        countryCode: 'KR',
        totalKeys: 450,
        translatedKeys: 423,
        coverage: 94.0,
        missingKeys: Array(3).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'hi-IN',
        language: 'Hindi',
        region: 'India',
        countryCode: 'IN',
        totalKeys: 450,
        translatedKeys: 270,
        coverage: 60.0,
        missingKeys: Array(15).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'th-TH',
        language: 'Thai',
        region: 'Thailand',
        countryCode: 'TH',
        totalKeys: 450,
        translatedKeys: 225,
        coverage: 50.0,
        missingKeys: Array(20).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'vi-VN',
        language: 'Vietnamese',
        region: 'Vietnam',
        countryCode: 'VN',
        totalKeys: 450,
        translatedKeys: 315,
        coverage: 70.0,
        missingKeys: Array(12).fill('key').map((k, i) => `${k}.${i}`)
      },

      // Americas
      {
        locale: 'es-MX',
        language: 'Spanish (Mexico)',
        region: 'Mexico',
        countryCode: 'MX',
        totalKeys: 450,
        translatedKeys: 392,
        coverage: 87.0,
        missingKeys: Array(6).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'pt-BR',
        language: 'Portuguese (Brazil)',
        region: 'Brazil',
        countryCode: 'BR',
        totalKeys: 450,
        translatedKeys: 414,
        coverage: 92.0,
        missingKeys: Array(4).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'en-CA',
        language: 'English (Canada)',
        region: 'Canada',
        countryCode: 'CA',
        totalKeys: 450,
        translatedKeys: 450,
        coverage: 100.0,
        missingKeys: []
      },

      // Middle East
      {
        locale: 'tr-TR',
        language: 'Turkish',
        region: 'Turkey',
        countryCode: 'TR',
        totalKeys: 450,
        translatedKeys: 338,
        coverage: 75.0,
        missingKeys: Array(9).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'ar-SA',
        language: 'Arabic',
        region: 'Saudi Arabia',
        countryCode: 'SA',
        totalKeys: 450,
        translatedKeys: 180,
        coverage: 40.0,
        missingKeys: Array(25).fill('key').map((k, i) => `${k}.${i}`)
      },
      {
        locale: 'he-IL',
        language: 'Hebrew',
        region: 'Israel',
        countryCode: 'IL',
        totalKeys: 450,
        translatedKeys: 293,
        coverage: 65.0,
        missingKeys: Array(14).fill('key').map((k, i) => `${k}.${i}`)
      },

      // Oceania
      {
        locale: 'en-AU',
        language: 'English (Australia)',
        region: 'Australia',
        countryCode: 'AU',
        totalKeys: 450,
        translatedKeys: 450,
        coverage: 100.0,
        missingKeys: []
      }
    ];

    const averageCoverage = locales.reduce((sum, l) => sum + l.coverage, 0) / locales.length;

    return {
      locales,
      defaultLocale: 'en-US',
      totalKeys: 450,
      averageCoverage
    };
  }

  /**
   * Get locales by coverage threshold
   */
  static filterByCoverage(data: I18nGeographicData, threshold: number): LocaleCoverage[] {
    return data.locales.filter(locale => locale.coverage >= threshold);
  }

  /**
   * Get locales with missing keys
   */
  static getIncompleteLocales(data: I18nGeographicData): LocaleCoverage[] {
    return data.locales.filter(locale => locale.missingKeys.length > 0);
  }

  /**
   * Get coverage by region grouping
   */
  static groupByRegion(data: I18nGeographicData): Map<string, LocaleCoverage[]> {
    const regionMap = new Map<string, LocaleCoverage[]>();

    data.locales.forEach(locale => {
      const region = this.getRegionGroup(locale.countryCode);
      if (!regionMap.has(region)) {
        regionMap.set(region, []);
      }
      regionMap.get(region)!.push(locale);
    });

    return regionMap;
  }

  /**
   * Get region group from country code
   */
  private static getRegionGroup(countryCode: string): string {
    const europe = ['DE', 'FR', 'ES', 'IT', 'PL', 'NL', 'SE', 'GB'];
    const asia = ['CN', 'JP', 'KR', 'IN', 'TH', 'VN', 'ID'];
    const americas = ['US', 'CA', 'MX', 'BR', 'AR'];
    const middleEast = ['TR', 'SA', 'IL'];
    const oceania = ['AU', 'NZ'];

    if (europe.includes(countryCode)) return 'Europe';
    if (asia.includes(countryCode)) return 'Asia';
    if (americas.includes(countryCode)) return 'Americas';
    if (middleEast.includes(countryCode)) return 'Middle East';
    if (oceania.includes(countryCode)) return 'Oceania';
    return 'Other';
  }

  /**
   * Calculate regional coverage statistics
   */
  static calculateRegionalStats(data: I18nGeographicData): {
    region: string;
    localeCount: number;
    avgCoverage: number;
    bestLocale: string;
    worstLocale: string;
  }[] {
    const regionMap = this.groupByRegion(data);
    const stats: any[] = [];

    regionMap.forEach((locales, region) => {
      const avgCoverage = locales.reduce((sum, l) => sum + l.coverage, 0) / locales.length;
      const sorted = [...locales].sort((a, b) => b.coverage - a.coverage);

      stats.push({
        region,
        localeCount: locales.length,
        avgCoverage,
        bestLocale: sorted[0]?.locale || 'N/A',
        worstLocale: sorted[sorted.length - 1]?.locale || 'N/A'
      });
    });

    return stats.sort((a, b) => b.avgCoverage - a.avgCoverage);
  }

  /**
   * Find most common missing keys across all locales
   */
  static getMostCommonMissingKeys(data: I18nGeographicData, topN: number = 10): {
    key: string;
    missingInLocales: number;
    affectedLocales: string[];
  }[] {
    const keyCount = new Map<string, string[]>();

    data.locales.forEach(locale => {
      locale.missingKeys.forEach(key => {
        if (!keyCount.has(key)) {
          keyCount.set(key, []);
        }
        keyCount.get(key)!.push(locale.locale);
      });
    });

    return Array.from(keyCount.entries())
      .map(([key, locales]) => ({
        key,
        missingInLocales: locales.length,
        affectedLocales: locales
      }))
      .sort((a, b) => b.missingInLocales - a.missingInLocales)
      .slice(0, topN);
  }
}
