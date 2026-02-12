import { describe, it, expect } from 'vitest';
import { generateSlug } from '../slug-utils';

describe('URL Slug Generation', () => {
  describe('Story Title Slugs', () => {
    it('Simple headline becomes lowercase hyphenated', () => {
      expect(generateSlug('Breaking News Today')).toBe('breaking-news-today');
    });

    it('Headlines with punctuation cleaned up', () => {
      expect(generateSlug('Breaking: Major Fire in CBD!')).toBe('breaking-major-fire-in-cbd');
    });

    it('Numbers preserved in slugs', () => {
      expect(generateSlug('Top 10 Stories of 2024')).toBe('top-10-stories-of-2024');
    });

    it('Special characters removed', () => {
      expect(generateSlug('What\'s Happening @ City Hall?')).toBe('whats-happening-city-hall');
    });

    it('Quotes and apostrophes handled', () => {
      expect(generateSlug('"Breaking" News: Mayor\'s Speech')).toBe('breaking-news-mayors-speech');
    });
  });

  describe('Edge Cases', () => {
    it('Multiple spaces collapsed', () => {
      expect(generateSlug('Story   With   Spaces')).toBe('story-with-spaces');
    });

    it('Multiple hyphens collapsed', () => {
      expect(generateSlug('Story - - - Title')).toBe('story-title');
    });

    it('Empty string returns empty', () => {
      expect(generateSlug('')).toBe('');
    });

    it('Only special characters returns empty', () => {
      expect(generateSlug('!@#$%^&*()')).toBe('');
    });

    it('Existing hyphens preserved', () => {
      expect(generateSlug('COVID-19 Update')).toBe('covid-19-update');
    });
  });

  describe('Bilingual Content', () => {
    it('Afrikaans titles work correctly', () => {
      expect(generateSlug('Nuus van die Dag')).toBe('nuus-van-die-dag');
    });

    it('Mixed language handled', () => {
      expect(generateSlug('Breaking Nuus Today')).toBe('breaking-nuus-today');
    });
  });
});
