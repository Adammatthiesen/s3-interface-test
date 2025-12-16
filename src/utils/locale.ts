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
 * import { changeLocale } from 'src/utils/locale';
 * 
 * // Change locale to Spanish
 * changeLocale('es');
 * 
 * // Change locale to French
 * changeLocale('fr');
 * ```
 */
export function changeLocale(locale?: string): void {
    const event = new CustomEvent('storage-browser:locale-change', {
        detail: { locale },
        bubbles: true,
        composed: true,
    });
    window.dispatchEvent(event);
}