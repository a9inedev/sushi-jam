/* Local notifications behind one small interface. Native goes through @capacitor/local-notifications with
   inexact Android alarms (no "Alarms & reminders" system prompt). The web build cannot fire anything once the
   tab is closed, so its backend only remembers what would have been scheduled; the dev panel and the smoke
   test read that list and can simulate a tap. */

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './native';

export type Permission = 'granted' | 'denied' | 'prompt';

export interface NotifyItem {
  id: number;
  title: string;
  body: string;
  at: number;
  extra: Record<string, unknown>;
}

export interface NotifyBackend {
  kind: 'native' | 'web';
  check(): Promise<Permission>;
  request(): Promise<Permission>;
  schedule(items: NotifyItem[]): Promise<void>;
  cancelAll(): Promise<void>;
  pending(): Promise<{ id: number; at: number }[]>;
  onTap(cb: (extra: Record<string, unknown>) => void): void;
}

function mapPermission(p: string): Permission {
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';
}

const nativeBackend: NotifyBackend = {
  kind: 'native',
  check: async () => mapPermission((await LocalNotifications.checkPermissions()).display),
  request: async () => mapPermission((await LocalNotifications.requestPermissions()).display),
  schedule: async (items) => {
    if (!items.length) return;
    await LocalNotifications.schedule({
      notifications: items.map((i) => ({
        id: i.id,
        title: i.title,
        body: i.body,
        extra: i.extra,
        schedule: { at: new Date(i.at), allowWhileIdle: false, isExactNotification: false },
      })),
    });
  },
  cancelAll: async () => {
    const p = await LocalNotifications.getPending();
    if (p.notifications.length)
      await LocalNotifications.cancel({ notifications: p.notifications.map((n) => ({ id: n.id })) });
  },
  pending: async () =>
    (await LocalNotifications.getPending()).notifications.map((n) => ({
      id: n.id,
      at: n.schedule?.at ? new Date(n.schedule.at).getTime() : 0,
    })),
  onTap: (cb) => {
    void LocalNotifications.addListener('localNotificationActionPerformed', (a) =>
      cb((a.notification.extra || {}) as Record<string, unknown>)
    );
  },
};

/** Web: a simulation. Nothing ever fires; the list exists so the flow can be exercised and tested. */
class WebNotify implements NotifyBackend {
  kind = 'web' as const;
  permission: Permission = 'prompt';
  items: NotifyItem[] = [];
  private tap: ((extra: Record<string, unknown>) => void) | null = null;
  async check(): Promise<Permission> {
    return this.permission;
  }
  async request(): Promise<Permission> {
    this.permission = 'granted';
    return this.permission;
  }
  async schedule(items: NotifyItem[]): Promise<void> {
    for (const i of items) {
      this.items = this.items.filter((x) => x.id !== i.id);
      this.items.push(i);
    }
  }
  async cancelAll(): Promise<void> {
    this.items = [];
  }
  async pending(): Promise<{ id: number; at: number }[]> {
    return this.items.map((i) => ({ id: i.id, at: i.at }));
  }
  onTap(cb: (extra: Record<string, unknown>) => void): void {
    this.tap = cb;
  }
  /** Test hook: act as if the notification with this id was tapped. */
  simulateTap(id: number): boolean {
    const i = this.items.find((x) => x.id === id);
    if (!i || !this.tap) return false;
    this.items = this.items.filter((x) => x.id !== id);
    this.tap(i.extra);
    return true;
  }
}

export const webNotify = new WebNotify();

export const notifyBackend: NotifyBackend = isNative ? nativeBackend : webNotify;
