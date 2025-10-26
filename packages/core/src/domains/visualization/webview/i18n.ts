/**
 * Webview Internationalization Utility
 *
 * Provides i18n support for the webview context.
 * Loads locale strings based on VSCode's display language.
 */

let currentLocale = 'en';
let translations: Record<string, string> = {};
let i18nInitialized = false;

// Event listeners for i18n initialization
type I18nListener = () => void;
const i18nListeners: I18nListener[] = [];

/**
 * Initialize i18n with locale from extension
 * @param locale The locale code (e.g., 'en', 'de', 'es', 'zh-cn', 'fr')
 * @param strings The translation strings for the locale
 */
export function initI18n(locale: string, strings: Record<string, string>): void {
    currentLocale = locale;
    translations = strings;
    i18nInitialized = true;
    console.log(`[i18n] Initialized with locale: ${locale}, ${Object.keys(strings).length} strings loaded`);

    // Notify all listeners that i18n is ready
    i18nListeners.forEach(listener => {
        try {
            listener();
        } catch (error) {
            console.error('[i18n] Error in i18n listener:', error);
        }
    });
}

/**
 * Register a listener to be called when i18n is initialized
 * If i18n is already initialized, the listener is called immediately
 * @param listener Callback function to call when i18n is ready
 */
export function onI18nReady(listener: I18nListener): void {
    if (i18nInitialized) {
        // Already initialized, call immediately
        listener();
    } else {
        // Not yet initialized, add to listeners
        i18nListeners.push(listener);
    }
}

/**
 * Check if i18n is initialized
 * @returns true if i18n has been initialized with translations
 */
export function isI18nReady(): boolean {
    return i18nInitialized;
}

/**
 * Get current locale
 * @returns The current locale code
 */
export function getLocale(): string {
    return currentLocale;
}

/**
 * Translate a key
 * @param key Translation key (e.g., 'tab.timeline', 'button.refresh')
 * @param defaultValue Fallback value if key not found (optional)
 * @returns Translated string or key/defaultValue if not found
 */
export function t(key: string, defaultValue?: string): string {
    const translated = translations[key];
    if (translated !== undefined) {
        return translated;
    }

    if (defaultValue !== undefined) {
        return defaultValue;
    }

    // Fallback to key if no translation found
    console.warn(`[i18n] Missing translation for key: ${key}`);
    return key;
}

/**
 * Translate with parameters
 * Replaces placeholders in the format {paramName} with provided values
 * @param key Translation key
 * @param params Parameters to substitute (e.g., {count: 5})
 * @returns Translated string with parameters replaced
 *
 * @example
 * // translations: { "status.itemCount": "{count} items" }
 * tf('status.itemCount', { count: 5 }) // "5 items"
 */
export function tf(key: string, params: Record<string, any>): string {
    let text = t(key);

    // Replace all {paramName} placeholders
    Object.keys(params).forEach(param => {
        const regex = new RegExp(`\\{${param}\\}`, 'g');
        text = text.replace(regex, String(params[param]));
    });

    return text;
}

/**
 * Check if a translation key exists
 * @param key Translation key
 * @returns true if the key has a translation
 */
export function hasTranslation(key: string): boolean {
    return translations[key] !== undefined;
}

/**
 * Get all available translation keys
 * @returns Array of all translation keys
 */
export function getAvailableKeys(): string[] {
    return Object.keys(translations);
}
