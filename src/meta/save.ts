/* The save manager: owns the live state S, writes it through the local provider and mirrors to a cloud
   provider when one is connected. Everything the game touches goes through here. */

import type { CloudSaveProvider, LoadSource } from './save-providers';
import { LocalSaveProvider } from './save-providers';
import { defaultSave, envelopeFor, migrate, normalize, type SaveState } from './save-schema';

export type { Inventory, SaveState } from './save-schema';
export { defaultSave } from './save-schema';

/** The live save. Mutated in place everywhere; persisted with save(). */
export const S: SaveState = defaultSave();

export interface LoadInfo {
  source: LoadSource;
  recovered: boolean;
  migratedFrom: number | null;
}

export const loadInfo: LoadInfo = { source: 'none', recovered: false, migratedFrom: null };

let local = new LocalSaveProvider();
let cloud: CloudSaveProvider | null = null;
let lastDataJson = '';
let lastBackupAt = 0;
let lastBackupLevel = -1;
let cloudTimer: ReturnType<typeof setTimeout> | null = null;

const BACKUP_INTERVAL_MS = 30000;

/** Swap the local provider (tests inject a fake storage). */
export function useLocalProvider(p: LocalSaveProvider): void {
  local = p;
  lastDataJson = '';
  lastBackupAt = 0;
  lastBackupLevel = -1;
}

export function setCloudProvider(p: CloudSaveProvider | null): void {
  cloud = p;
}

export function cloudProvider(): CloudSaveProvider | null {
  return cloud;
}

export function load(): LoadInfo {
  const r = local.load();
  loadInfo.source = r.source;
  loadInfo.recovered = r.recovered;
  loadInfo.migratedFrom = r.migratedFrom;
  if (r.state) {
    Object.assign(S, defaultSave(), r.state);
    // Re-establish a verified primary copy right away when we loaded from anywhere but a healthy main.
    if (r.source !== 'main') save(true);
  }
  return loadInfo;
}

/** Persist S. Skips the write when nothing changed unless forced. Returns false if storage refused. */
export function save(force = false): boolean {
  const { json, dataJson } = envelopeFor(S);
  if (!force && dataJson === lastDataJson) return true;
  const now = Date.now();
  const rotate = lastBackupLevel !== S.level || now - lastBackupAt > BACKUP_INTERVAL_MS;
  const ok = local.write(json, { rotateBackup: rotate });
  if (ok) {
    lastDataJson = dataJson;
    if (rotate) {
      lastBackupAt = now;
      lastBackupLevel = S.level;
    }
    scheduleCloudPush();
  }
  return ok;
}

export interface BackupInfo {
  level: number;
  coins: number;
  savedAt: number;
}

export function backupInfo(): BackupInfo | null {
  const e = local.readBackup();
  const m = e && migrate(e);
  if (!e || !m) return null;
  return { level: m.state.level, coins: m.state.coins, savedAt: e.savedAt };
}

/** Replace the live state wholesale (restore paths) and persist it. */
export function replaceState(state: SaveState): void {
  Object.assign(S, defaultSave(), normalize(state));
  lastDataJson = '';
  save(true);
}

export function restoreFromBackup(): boolean {
  const e = local.readBackup();
  const m = e && migrate(e);
  if (!m) return false;
  replaceState(m.state);
  return true;
}

/** Make sure main is current, then copy it into the backup slot. Used by the dev API and tests. */
export function rotateBackup(): boolean {
  save(true);
  return local.rotateBackup();
}

export function clearSave(): void {
  local.clear();
  lastDataJson = '';
  lastBackupAt = 0;
  lastBackupLevel = -1;
}

/* ---------- cloud mirror ---------- */

function scheduleCloudPush(): void {
  if (!cloud) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    cloudTimer = null;
    void pushToCloud();
  }, 2000);
}

export async function pushToCloud(): Promise<boolean> {
  if (!cloud) return false;
  try {
    if (!(await cloud.isAvailable())) return false;
    await cloud.store(envelopeFor(S).env);
    return true;
  } catch {
    return false;
  }
}

export async function restoreFromCloud(): Promise<boolean> {
  if (!cloud) return false;
  try {
    if (!(await cloud.isAvailable())) return false;
    const env = await cloud.load();
    const m = env && migrate(env);
    if (!m) return false;
    replaceState(m.state);
    return true;
  } catch {
    return false;
  }
}
