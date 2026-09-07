import { describe, expect, it } from 'vitest';
import { isRTL, LANGUAGES, locale, matchLocale, setLocale, t, TABLES } from '../src/i18n';

const en = TABLES.en;
const keys = Object.keys(en);
const playerKeys = keys.filter((k) => !k.startsWith('dev.'));

describe('locale tables', () => {
  it('every locale in the language list has a table and every player-facing key', () => {
    for (const l of LANGUAGES) {
      const table = TABLES[l.code];
      expect(table, l.code).toBeDefined();
      const missing = playerKeys.filter((k) => !(k in table));
      expect(missing, l.code + ' missing keys').toEqual([]);
      const extra = Object.keys(table).filter((k) => !(k in en));
      expect(extra, l.code + ' unknown keys').toEqual([]);
    }
  });

  it('placeholders match English in every locale', () => {
    const holes = (v: unknown): string[] => {
      const s = typeof v === 'string' ? v : Object.values(v as Record<string, string>).join(' ');
      return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    };
    for (const l of LANGUAGES) {
      if (l.code === 'en') continue;
      for (const k of playerKeys) {
        const a = new Set(holes(en[k])),
          b = new Set(holes(TABLES[l.code][k]));
        for (const h of a) expect(b.has(h), `${l.code} ${k} lost {${h}}`).toBe(true);
      }
    }
  });

  it('plural entries always carry an "other" form', () => {
    for (const l of LANGUAGES)
      for (const [k, v] of Object.entries(TABLES[l.code]))
        if (typeof v !== 'string') expect((v as { other?: string }).other, `${l.code} ${k}`).toBeTruthy();
  });

  it('non-English locales actually differ from English for most keys', () => {
    for (const l of LANGUAGES) {
      if (l.code === 'en') continue;
      let same = 0;
      for (const k of playerKeys) if (JSON.stringify(TABLES[l.code][k]) === JSON.stringify(en[k])) same++;
      // Brand names, prices and a handful of loanwords legitimately match.
      expect(same / playerKeys.length, l.code).toBeLessThan(0.15);
    }
  });
});

describe('t()', () => {
  it('interpolates and picks plural forms with Intl.PluralRules', () => {
    setLocale('en');
    expect(t('hud.level', { n: 7 })).toBe('Level 7');
    expect(t('hud.platesLeft', { n: 1 })).toBe('1 plate left');
    expect(t('hud.platesLeft', { n: 4 })).toBe('4 plates left');
    expect(t('nope.missing')).toBe('nope.missing');
    setLocale('ar');
    expect(t('hud.platesLeft', { n: 0 })).toContain('لا');
    expect(t('hud.platesLeft', { n: 2 })).toContain('طبقان');
    expect(t('hud.platesLeft', { n: 5 })).toContain('5');
    setLocale('en');
  });

  it('falls back to English for keys a locale lacks (dev panel)', () => {
    setLocale('fr');
    expect(t('dev.title')).toBe('Dev panel');
    expect(t('settings.title')).toBe('Réglages');
    setLocale('en');
  });

  it('matches browser tags to locales and flags RTL', () => {
    expect(matchLocale('pt-PT')).toBe('pt-BR');
    expect(matchLocale('zh-TW')).toBe('zh-Hans');
    expect(matchLocale('de-AT')).toBe('de');
    expect(matchLocale('xx')).toBe('en');
    expect(matchLocale(undefined)).toBe('en');
    setLocale('ar');
    expect(locale()).toBe('ar');
    expect(isRTL()).toBe(true);
    setLocale('ja');
    expect(isRTL()).toBe(false);
    setLocale('en');
  });
});
