/* A one-line text field over the canvas, for the few places the game needs typed text (the profile name).
   The DOM input brings the platform keyboard; Enter or tapping away commits, Escape cancels. */

import { cv } from '../render/canvas';

export const TEXT_FIELD_ID = 'sj-text';

let current: HTMLInputElement | null = null;
let currentDone: ((value: string | null) => void) | null = null;

export interface TextFieldOptions {
  value: string;
  maxLength: number;
  placeholder: string;
  /** Game-space box the field should cover (480x900 units). */
  box: { x: number; y: number; w: number; h: number };
  onDone: (value: string | null) => void;
}

export function textFieldOpen(): boolean {
  return !!current;
}

export function openTextField(o: TextFieldOptions): void {
  closeTextField(null);
  const el = document.createElement('input');
  el.id = TEXT_FIELD_ID;
  el.type = 'text';
  el.maxLength = o.maxLength;
  el.value = o.value;
  el.placeholder = o.placeholder;
  el.autocomplete = 'off';
  el.autocapitalize = 'words';
  el.spellcheck = false;
  const r = cv.getBoundingClientRect();
  const sx = r.width / 480,
    sy = r.height / 900;
  Object.assign(el.style, {
    position: 'fixed',
    left: `${r.left + o.box.x * sx}px`,
    top: `${r.top + o.box.y * sy}px`,
    width: `${o.box.w * sx}px`,
    height: `${o.box.h * sy}px`,
    boxSizing: 'border-box',
    padding: '0 12px', // i18n-ignore
    border: '2px solid #6A4C93', // i18n-ignore
    borderRadius: '10px',
    background: '#FFFDF7',
    color: '#2A2320',
    font: `800 ${Math.round(18 * sy)}px Nunito, "Segoe UI", system-ui, sans-serif`,
    outline: 'none',
    zIndex: '20',
  } as Partial<CSSStyleDeclaration>);
  let finished = false;
  const finish = (value: string | null) => {
    if (finished) return;
    finished = true;
    if (current === el) {
      current = null;
      currentDone = null;
    }
    el.remove();
    o.onDone(value);
  };
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(el.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(null);
    }
  });
  el.addEventListener('blur', () => finish(el.value));
  current = el;
  currentDone = finish;
  document.body.appendChild(el);
  el.focus();
  el.select();
}

/** Close the open field, committing the value passed (null cancels). */
export function closeTextField(value: string | null): void {
  const done = currentDone;
  if (done) done(value);
}
