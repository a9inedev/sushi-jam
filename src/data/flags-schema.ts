/* Remote flags: small switches the live game reads from flags.json (bundled, cached, fetched). Pure. */

export type LivesVariant = 'A' | 'B';

export interface Flags {
  v: number;
  lives: {
    /** 'A' no lives, 'B' lives, 'split' assigns each install by a stable hash. */
    variant: LivesVariant | 'split';
    /** Percent of installs that get B when variant is 'split'. */
    split: number;
    max: number;
    refillMinutes: number;
  };
  analytics: { enabled: boolean };
}

export const FLAGS_VERSION = 1;

export function defaultFlags(): Flags {
  return {
    v: FLAGS_VERSION,
    lives: { variant: 'A', split: 0, max: 5, refillMinutes: 30 },
    analytics: { enabled: true },
  };
}

const int = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

export function validateFlags(x: unknown): { flags: Flags | null; error: string | null } {
  const bad = (error: string) => ({ flags: null, error });
  if (!x || typeof x !== 'object') return bad('not an object');
  const o = x as Record<string, unknown>;
  if (o.v !== FLAGS_VERSION) return bad(`version ${String(o.v)} is not ${FLAGS_VERSION}`);
  const l = o.lives as Record<string, unknown> | undefined;
  if (!l || typeof l !== 'object') return bad('lives missing');
  if (l.variant !== 'A' && l.variant !== 'B' && l.variant !== 'split')
    return bad('lives.variant must be A, B or split');
  if (!int(l.split, 0, 100)) return bad('lives.split must be 0..100');
  if (!int(l.max, 1, 20)) return bad('lives.max must be 1..20');
  if (!int(l.refillMinutes, 1, 1440)) return bad('lives.refillMinutes must be 1..1440');
  const a = o.analytics as Record<string, unknown> | undefined;
  if (!a || typeof a !== 'object' || typeof a.enabled !== 'boolean') return bad('analytics.enabled must be a boolean');
  return {
    flags: {
      v: FLAGS_VERSION,
      lives: { variant: l.variant, split: l.split, max: l.max, refillMinutes: l.refillMinutes },
      analytics: { enabled: a.enabled },
    },
    error: null,
  };
}

/** FNV-1a, same as the engine's, kept here so this file stays import-free. */
export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Which arm an install is in. A split is stable per install id and salted so it does not line up with any
    other experiment that hashes the same id. */
export function variantFor(flags: Flags, installId: string): LivesVariant {
  if (flags.lives.variant === 'A' || flags.lives.variant === 'B') return flags.lives.variant;
  return hash32('lives:' + installId) % 100 < flags.lives.split ? 'B' : 'A';
}
