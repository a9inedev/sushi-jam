/* Thin layer over the Capacitor plugins. Every call is safe on the plain web build: native-only features
   degrade to a browser fallback where one exists (vibration, screen wake lock) and to a no-op otherwise. */

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';

export const isNative = Capacitor.isNativePlatform();
export const platform: 'web' | 'ios' | 'android' = Capacitor.getPlatform() as 'web' | 'ios' | 'android';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

let hapticsAllowed: () => boolean = () => true;

/** Install the settings check that gates every haptic call. */
export function setHapticsGate(fn: () => boolean): void {
  hapticsAllowed = fn;
}

const WEB_PATTERN: Record<HapticKind, number | number[]> = {
  light: 12,
  medium: 25,
  heavy: 45,
  success: [20, 40, 20, 40, 45],
  warning: [30, 60, 30],
};

export function haptic(kind: HapticKind): void {
  if (!hapticsAllowed()) return;
  try {
    if (isNative) {
      if (kind === 'success') void Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'warning') void Haptics.notification({ type: NotificationType.Warning });
      else {
        const style = kind === 'light' ? ImpactStyle.Light : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy;
        void Haptics.impact({ style });
      }
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(WEB_PATTERN[kind]);
    }
  } catch {
    /* haptics are decoration */
  }
}

let awake = false;
let webLock: { release: () => Promise<void> } | null = null;

/** Keep the screen on while a level is being played. Idempotent. */
export function keepAwake(on: boolean): void {
  if (on === awake) return;
  awake = on;
  try {
    if (isNative) {
      if (on) void KeepAwake.keepAwake();
      else void KeepAwake.allowSleep();
      return;
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    if (on && !webLock) {
      nav.wakeLock
        .request('screen')
        .then((l) => {
          webLock = l;
          if (!awake) void l.release().then(() => (webLock = null));
        })
        .catch(() => {});
    } else if (!on && webLock) {
      const l = webLock;
      webLock = null;
      void l.release().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export function hideStatusBar(): void {
  if (!isNative) return;
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  StatusBar.hide().catch(() => {});
}

export function hideSplash(): void {
  if (!isNative) return;
  SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
}

/** Android hardware/gesture back. The callback decides what to do; the app never exits from here. */
export function onBackButton(cb: () => void): void {
  if (!isNative) return;
  void App.addListener('backButton', () => cb());
}

/** Fires with false when the app goes to the background and true when it returns. */
export function onAppActive(cb: (active: boolean) => void): void {
  if (isNative) void App.addListener('appStateChange', ({ isActive }) => cb(isActive));
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => cb(document.visibilityState === 'visible'));
}
