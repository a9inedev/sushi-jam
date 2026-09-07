/* Guards the "every string passes through t()" rule: scans the presentation code for quoted English prose.
   A literal with two or more letters and a space that is not inside a t('...') call or marked i18n-ignore
   fails the build. Keys, CSS colours, glyphs, SVG markup and identifiers do not count. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = [
  'src/ui',
  'src/engine/rules.ts',
  'src/meta/economy.ts',
  'src/meta/flow.ts',
  'src/main.ts',
  'src/render/scene.ts',
  'src/render/diner.ts',
  'src/render/plate.ts',
];

function files(p: string): string[] {
  if (statSync(p).isFile()) return [p];
  return readdirSync(p).flatMap((f) => files(join(p, f)));
}

const ALLOW = [
  /^rgba?\(/, // canvas colours
  /^#[0-9A-Fa-f]{3,8}$/, // hex colours
  /^[\d\s.,+×%·/#$-]*$/, // numbers and separators
  /^https?:/, // links
  /^</, // SVG or HTML markup
  /^[MLQZCAHVmlqzcahv0-9\s.,-]+$/, // SVG path data
  /font|Baloo|sans-serif/, // font stacks
];

describe('hard-coded UI strings', () => {
  it('no English prose literal outside t()', () => {
    const offenders: string[] = [];
    for (const root of ROOTS)
      for (const f of files(root)) {
        const src = readFileSync(f, 'utf8').split('\n');
        src.forEach((line, i) => {
          if (/i18n-ignore/.test(line) || /^\s*(\/\/|\/\*|\*)/.test(line) || /^\s*import /.test(line)) return;
          // Drop t('...') keys, console output and template expressions so only bare literals remain.
          const stripped = line
            .replace(/\bt\((['"`])[^'"`]*\1/g, 't(')
            .replace(/console\.\w+\([^)]*\)/g, '')
            .replace(/\$\{[^}]*\}/g, '');
          for (const m of stripped.matchAll(/(['"`])((?:(?!\1).)*?)\1/g)) {
            const s = m[2];
            if (!/[A-Za-z]{2,}/.test(s) || !/\s/.test(s)) continue;
            if (ALLOW.some((re) => re.test(s))) continue;
            offenders.push(`${f}:${i + 1}: ${s}`);
          }
        });
      }
    expect(offenders).toEqual([]);
  });
});
