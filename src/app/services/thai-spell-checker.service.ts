import { Injectable } from '@angular/core';
import Typo from 'typo-js';

@Injectable({
  providedIn: 'root'
})
export class ThaiSpellCheckerService {
  private dictionary: Typo | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeDictionary();
  }

  private async initializeDictionary() {
    try {
      // Initialize Thai dictionary
      this.dictionary = new Typo('th_TH', undefined, undefined, {
        dictionaryPath: 'assets/dictionaries'
      });
      this.isInitialized = true;
    } catch (error) {
      console.warn('Thai spell checker dictionary not found, using fallback mode:', error);
      this.isInitialized = false;
    }
  }

  checkSpelling(word: string): boolean {
    if (!this.isInitialized || !this.dictionary) {
      return true; // Assume correct if dictionary not loaded
    }
    return this.dictionary.check(word);
  }

  getSuggestions(word: string): string[] {
    if (!this.isInitialized || !this.dictionary) {
      return [];
    }
    return this.dictionary.suggest(word);
  }

  correctText(text: string): string {
    if (!text || !this.isInitialized || !this.dictionary) {
      return text;
    }

    // Split text into words while preserving punctuation and spaces
    const words = text.split(/(\s+|[^\u0E00-\u0E7F\s]+)/);

    return words.map(word => {
      // Skip empty strings, spaces, and non-Thai characters
      if (!word.trim() || /^\s+$/.test(word) || /[^\u0E00-\u0E7F]/.test(word)) {
        return word;
      }

      // Check if word is spelled correctly
      if (this.checkSpelling(word)) {
        return word;
      }

      // Get suggestions and use the first one if available
      const suggestions = this.getSuggestions(word);
      if (suggestions.length > 0) {
        return suggestions[0];
      }

      return word;
    }).join('');
  }

  // Enhanced typo correction with common Thai typo patterns
  correctThaiTypos(text: string): string {
    if (!text) return text;

    // Common Thai typo corrections (fallback when dictionary is not available)
    const commonTypos: { [key: string]: string } = {
      'มะเขือเทด': 'มะเขือเทศ',
      'ผักชีฝรัง': 'ผักชีฝรั่ง',
      'ฯลฯ': 'ฯลฯ',
      'เดัด': 'เด็ด',
      'เทด': 'เทศ',
      'แครัอด': 'แครอท',
      'ลูกชิ้นปลากาย': 'ลูกชิ้นปลากราย',
      'เมัด': 'เม็ด',
      'ลูกฟัก': 'ฟักแก่',
      // Add more common corrections as needed
    };

    let correctedText = text;

    // Apply common typo corrections
    Object.entries(commonTypos).forEach(([wrong, correct]) => {
      correctedText = correctedText.replace(new RegExp(wrong, 'g'), correct);
    });

    // Apply pattern-based corrections for common Thai typos
    const typoPatterns = [
      // ด -> ศ corrections
      { pattern: /มะเขือเทด/g, replacement: 'มะเขือเทศ' },
      { pattern: /ผักชีฝั่ง/g, replacement: 'ผักชีฝรั่ง' },
      // Common character confusion patterns
      { pattern: /([ก-ฮ])ด\b/g, replacement: '$1ศ' },
      { pattern: /([ก-ฮ])ศ\b/g, replacement: '$1ด' },
    ];

    typoPatterns.forEach(({ pattern, replacement }) => {
      correctedText = correctedText.replace(pattern, replacement);
    });

    // If dictionary is available, use it for more sophisticated correction
    if (this.isInitialized && this.dictionary) {
      correctedText = this.correctText(correctedText);
    }

    return correctedText;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
