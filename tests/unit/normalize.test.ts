import { describe, it, expect } from 'vitest';
import { normalizeCategoryName, clean } from '../../src/utils/normalize';

describe('normalizeCategoryName', () => {
  it('should remove whitespace', () => {
    expect(normalizeCategoryName(' AI & ML ')).toBe('aiml');
  });

  it('should convert to lowercase', () => {
    expect(normalizeCategoryName('GAMING')).toBe('gaming');
  });

  it('should remove special characters like ＆, &, ・', () => {
    expect(normalizeCategoryName('AI & ML')).toBe('aiml');
    expect(normalizeCategoryName('AI ＆ ML')).toBe('aiml');
    expect(normalizeCategoryName('PC・ハードウェア')).toBe('pcハードウェア');
  });

  it('should handle Unicode characters', () => {
    expect(normalizeCategoryName('ゲーム＆アニメ')).toBe('ゲームアニメ');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeCategoryName('')).toBe('');
  });

  it('should handle only symbols', () => {
    expect(normalizeCategoryName('＆ & ・')).toBe('');
  });

  it('clean should be an alias of normalizeCategoryName', () => {
    expect(clean).toBe(normalizeCategoryName);
    expect(clean(' Test ')).toBe('test');
  });
});
