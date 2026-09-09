/* Which restaurant the scene, the sprites and the music are showing right now. Set when a level starts. */

import { THEMES, type ThemeDef } from './themes';

let active: ThemeDef = THEMES[0];
const listeners: ((t: ThemeDef) => void)[] = [];

export function activeTheme(): ThemeDef {
  return active;
}

/** Returns true when the theme actually changed; listeners (the music) are told either way only on change. */
export function setActiveTheme(t: ThemeDef): boolean {
  if (t === active) return false;
  active = t;
  for (const fn of listeners) fn(t);
  return true;
}

export function onThemeChange(fn: (t: ThemeDef) => void): void {
  listeners.push(fn);
}
