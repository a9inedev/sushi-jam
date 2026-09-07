/* Localisation: t(key, vars) with {name} interpolation and CLDR plural categories through Intl.PluralRules.
   en.json is the source of truth; other locales fall back to English key by key. */

import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import ja from './ja.json';
import ko from './ko.json';
import ptBR from './pt-BR.json';
import tr from './tr.json';
import zhHans from './zh-Hans.json';

export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Table = Record<string, string | Plural>;

export interface Language {
  code: string;
  /** Name in its own language, shown in Settings. */
  name: string;
  rtl?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'tr', name: 'Türkçe' },
];

export const TABLES: Record<string, Table> = {
  en: en as Table,
  es: es as Table,
  'pt-BR': ptBR as Table,
  de: de as Table,
  fr: fr as Table,
  it: it as Table,
  ja: ja as Table,
  ko: ko as Table,
  'zh-Hans': zhHans as Table,
  ar: ar as Table,
  tr: tr as Table,
};

let current = 'en';
let rules: Intl.PluralRules | null = null;

/** Map a BCP 47 tag from the browser to one of our locale codes. */
export function matchLocale(tag: string | undefined | null): string {
  if (!tag) return 'en';
  const low = tag.toLowerCase();
  if (low.startsWith('pt')) return 'pt-BR';
  if (low.startsWith('zh')) return 'zh-Hans';
  const base = low.split('-')[0];
  return LANGUAGES.some((l) => l.code === base) ? base : 'en';
}

export function setLocale(code: string): void {
  current = TABLES[code] ? code : 'en';
  try {
    rules = new Intl.PluralRules(current === 'zh-Hans' ? 'zh' : current);
  } catch {
    rules = null;
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
    document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
  }
}

export function locale(): string {
  return current;
}

export function isRTL(): boolean {
  return !!LANGUAGES.find((l) => l.code === current)?.rtl;
}

export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name || code;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

function lookup(key: string): string | Plural | undefined {
  const table = TABLES[current];
  return (table && table[key]) ?? TABLES.en[key];
}

/** Translate a key. Plural entries pick their form from vars.n (or vars.count). */
export function t(key: string, vars?: Record<string, string | number>): string {
  const v = lookup(key);
  if (v === undefined) return key;
  if (typeof v === 'string') return interpolate(v, vars);
  const n = Number(vars?.n ?? vars?.count ?? 0);
  let cat: string;
  try {
    cat = rules ? rules.select(n) : n === 1 ? 'one' : 'other';
  } catch {
    cat = n === 1 ? 'one' : 'other';
  }
  const form = (v as Record<string, string | undefined>)[cat] ?? v.other;
  return interpolate(form, { n, ...vars });
}

/** True when the key exists in the current locale itself (not through the English fallback). */
export function hasOwn(key: string): boolean {
  const table = TABLES[current];
  return !!table && key in table;
}

setLocale('en');
