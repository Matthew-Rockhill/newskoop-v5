/**
 * Language utility functions for formatting and mapping language codes
 */

export type LanguageCode = 'ENGLISH' | 'AFRIKAANS' | 'XHOSA';

/**
 * Maps technical language codes to readable display names
 */
export const LANGUAGE_DISPLAY_NAMES: Record<LanguageCode, string> = {
  ENGLISH: 'English',
  AFRIKAANS: 'Afrikaans',
  XHOSA: 'Xhosa',
};

/**
 * Formats a language code to a readable display name
 * @param languageCode - The technical language code (e.g., 'AFRIKAANS')
 * @returns The formatted display name (e.g., 'Afrikaans')
 */
export function formatLanguage(languageCode: string): string {
  const upperCode = languageCode.toUpperCase() as LanguageCode;
  return LANGUAGE_DISPLAY_NAMES[upperCode] || languageCode;
}

/**
 * Formats multiple language codes to readable display names
 * @param languageCodes - Array of technical language codes
 * @returns Array of formatted display names
 */
export function formatLanguages(languageCodes: string[]): string[] {
  return languageCodes.map(formatLanguage);
}

/**
 * Gets all available language options for form selects
 * @returns Array of language options with code and display name
 */
export function getLanguageOptions() {
  return Object.entries(LANGUAGE_DISPLAY_NAMES).map(([code, name]) => ({
    value: code,
    label: name,
  }));
}