# Save system

Progress lives in the browser's local storage (or the WebView's, in the native apps) as a versioned, checksummed envelope with atomic writes and a last-good backup copy. Code: `src/meta/save-schema.ts` (format and migrations, pure), `src/meta/save-providers.ts` (storage and cloud providers), `src/meta/save.ts` (the manager the game calls).

## Keys

| Key                 | Content                                                  |
| ------------------- | -------------------------------------------------------- |
| `sushijam.save`     | Primary copy, v4 envelope                                |
| `sushijam.save.tmp` | In-flight write; only present if a write was interrupted |
| `sushijam.save.bak` | Last good copy; rotates on level change or every 30 s    |
| `sushijam.v2`       | Legacy flat blob (read once, migrated, left in place)    |
| `sushijam.v1`       | Legacy `{ level, coins, sound }` (same)                  |

## Envelope

```json
{ "v": 3, "savedAt": 1757203200000, "sum": 2166136261, "data": { "level": 12, "coins": 450, "...": "..." } }
```

`sum` is FNV-1a over `JSON.stringify(data)`. A copy whose checksum does not match is treated as missing. `SAVE_VERSION` is the schema number; bump it and add a `MIGRATIONS[n]` step whenever a field changes meaning or a required field is added.

## Write path (`save()`)

1. Serialise `S`. If nothing changed since the last write, stop.
2. Write the envelope to `.tmp` and read it back to verify.
3. If the previous primary copy is valid and either the backup is due (level changed or 30 s elapsed) or no backup exists yet, copy the previous primary into `.bak`.
4. Write the primary and verify. Remove `.tmp`.

A failure at any step leaves the previous primary untouched. If the failure happened after step 2, the next load picks up the newer `.tmp`.

## Read path (`load()`)

1. Parse and verify primary, temp and backup. Take the newest valid one. If it was not the primary, the load is flagged `recovered`, a toast tells the player, and a fresh primary is written at once.
2. If none is valid, read `sushijam.v2`, then `sushijam.v1`, and run them through the migration chain. A v3 primary is written immediately after.
3. Otherwise start fresh.

Every loaded blob passes through `normalize()`, which coerces each field to its expected type and range, so a damaged field costs that field, not the whole save.

## Migrations

| From | To  | What changes                                                    |
| ---- | --- | --------------------------------------------------------------- |
| v1   | v2  | Keep level, coins, sound; everything else takes the v2 defaults |
| v2   | v3  | Add `haptics: true`; guarantee `inv.vip/takeout/sendback` exist |
| v3   | v4  | Add `reduceMotion: false`                                       |

`migrate(x)` detects the version (envelope `v`, else v2 markers like `inv`/`stats`, else v1 markers) and applies each step in order. A save written by a newer build is read best-effort: known fields survive, unknown fields are dropped.

## Providers

- `LocalSaveProvider` is synchronous and primary. It takes any `StorageLike`; when local storage is unavailable it uses an in-memory store so a session still works.
- `CloudSaveProvider` is the async interface for Game Center saved games and Play Games snapshots. `GameCenterSaveProvider` and `PlayGamesSaveProvider` are stubs that report unavailable; the manager mirrors every save to the cloud provider two seconds after the last change once one reports available, and `restoreFromCloud()` pulls the cloud copy into `S`. Wiring the native plugins is Phase 3.3.

## Player-facing controls (Settings)

- **Restore progress** shows the backup's level, coins and age, asks for confirmation, then replaces the live state with it and restarts the level.
- **Reset progress** asks for confirmation, wipes every key including the legacy ones, and reloads.

## Dev API

`window.__SJ.saveApi` exposes `save(force)`, `rotateBackup()`, `backupInfo()`, `restoreFromBackup()`, `clear()` and `info()` (source of the last load, whether it was recovered, and the schema it migrated from). The smoke test uses these to prove migration, corruption recovery, restore and reset in a real browser.
