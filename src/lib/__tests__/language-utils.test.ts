import { describe, it, expect } from 'vitest';
import {
  formatLanguage,
  formatLanguages,
  getLanguageOptions,
  LANGUAGE_DISPLAY_NAMES,
} from '../language-utils';

describe('Language Support', () => {
  describe('Format Single Language', () => {
    it('ENGLISH formats to English', () => {
      expect(formatLanguage('ENGLISH')).toBe('English');
    });

    it('AFRIKAANS formats to Afrikaans', () => {
      expect(formatLanguage('AFRIKAANS')).toBe('Afrikaans');
    });

    it('XHOSA formats to Xhosa', () => {
      expect(formatLanguage('XHOSA')).toBe('Xhosa');
    });

    it('ZULU formats to Zulu', () => {
      expect(formatLanguage('ZULU')).toBe('Zulu');
    });

    it('Lowercase input still formats correctly', () => {
      expect(formatLanguage('english')).toBe('English');
      expect(formatLanguage('afrikaans')).toBe('Afrikaans');
    });

    it('Mixed case input formats correctly', () => {
      expect(formatLanguage('EnGlIsH')).toBe('English');
    });

    it('Unknown language returns original code', () => {
      expect(formatLanguage('FRENCH')).toBe('FRENCH');
    });

    it('Null returns empty string', () => {
      expect(formatLanguage(null)).toBe('');
    });

    it('Undefined returns empty string', () => {
      expect(formatLanguage(undefined)).toBe('');
    });

    it('Empty string returns empty string', () => {
      expect(formatLanguage('')).toBe('');
    });
  });

  describe('Format Multiple Languages', () => {
    it('Formats array of language codes', () => {
      expect(formatLanguages(['ENGLISH', 'AFRIKAANS'])).toEqual(['English', 'Afrikaans']);
    });

    it('Formats all supported languages', () => {
      expect(formatLanguages(['ENGLISH', 'AFRIKAANS', 'XHOSA', 'ZULU']))
        .toEqual(['English', 'Afrikaans', 'Xhosa', 'Zulu']);
    });

    it('Empty array returns empty array', () => {
      expect(formatLanguages([])).toEqual([]);
    });

    it('Handles mixed case in array', () => {
      expect(formatLanguages(['english', 'AFRIKAANS'])).toEqual(['English', 'Afrikaans']);
    });
  });

  describe('Language Options for Forms', () => {
    it('Returns all supported languages as options', () => {
      const options = getLanguageOptions();
      expect(options).toHaveLength(4);
    });

    it('Each option has value and label', () => {
      const options = getLanguageOptions();
      options.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
      });
    });

    it('Options include English', () => {
      const options = getLanguageOptions();
      expect(options).toContainEqual({ value: 'ENGLISH', label: 'English' });
    });

    it('Options include Afrikaans', () => {
      const options = getLanguageOptions();
      expect(options).toContainEqual({ value: 'AFRIKAANS', label: 'Afrikaans' });
    });

    it('Options include Xhosa', () => {
      const options = getLanguageOptions();
      expect(options).toContainEqual({ value: 'XHOSA', label: 'Xhosa' });
    });

    it('Options include Zulu', () => {
      const options = getLanguageOptions();
      expect(options).toContainEqual({ value: 'ZULU', label: 'Zulu' });
    });
  });

  describe('Language Display Names Mapping', () => {
    it('All four South African languages are supported', () => {
      expect(Object.keys(LANGUAGE_DISPLAY_NAMES)).toHaveLength(4);
    });

    it('Display names are properly capitalized', () => {
      expect(LANGUAGE_DISPLAY_NAMES.ENGLISH).toBe('English');
      expect(LANGUAGE_DISPLAY_NAMES.AFRIKAANS).toBe('Afrikaans');
      expect(LANGUAGE_DISPLAY_NAMES.XHOSA).toBe('Xhosa');
      expect(LANGUAGE_DISPLAY_NAMES.ZULU).toBe('Zulu');
    });
  });
});
