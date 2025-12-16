/**
 * Utility functions for managing locale changes in the StorageFileBrowser component
 */

/**
 * Dispatches a custom locale-change event to update all StorageFileBrowser instances
 * 
 * @param locale - The new locale code (e.g., 'en', 'es', 'fr')
 * 
 * @example
 * ```ts
 * import { changeLocale } from '@/utils/locale';
 * 
 * // Change locale to Spanish
 * changeLocale('es');
 * 
 * // Change locale to French
 * changeLocale('fr');
 * ```
 */
export function changeLocale(locale: string): void {
    const event = new CustomEvent('storage-browser:locale-change', {
        detail: { locale },
        bubbles: true,
        composed: true,
    });
    window.dispatchEvent(event);
}

/**
 * Gets the current locale from the document's lang attribute or defaults to 'en'
 * 
 * @returns The current locale code
 * 
 * @example
 * ```ts
 * import { getCurrentLocale } from '@/utils/locale';
 * 
 * const currentLocale = getCurrentLocale();
 * console.log(currentLocale); // 'en'
 * ```
 */
export function getCurrentLocale(): string {
    return document.documentElement.lang || 'en';
}

/**
 * Sets the document's lang attribute and dispatches a locale-change event
 * 
 * @param locale - The new locale code
 * 
 * @example
 * ```ts
 * import { setDocumentLocale } from '@/utils/locale';
 * 
 * // Set document locale and update all StorageFileBrowser instances
 * setDocumentLocale('es');
 * ```
 */
export function setDocumentLocale(locale: string): void {
    document.documentElement.lang = locale;
    changeLocale(locale);
}
