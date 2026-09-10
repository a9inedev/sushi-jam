# Reminders (local notifications)

Three local notifications, all off until the player says yes:

| Reminder       | When                                                                                                                                                                         | Opens                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Daily bonus    | at the hour the player usually plays (the most common local hour of their last 60 level results; 19:00 until there are five), tomorrow if today's bonus is already collected | the bonus card if uncollected, else the map's Modes tab |
| Streak at risk | 20:30 local, on a day the login streak (2+) or daily-puzzle streak (2+) still needs something; tomorrow evening when today is done; nothing once the evening has passed      | the map's Modes tab                                     |
| Event ending   | three hours before the end of an active event the player has progress in but has not finished                                                                                | the Events screen                                       |

## Respectful defaults

- No prompt at first launch. The opt-in card appears once, after the player clears level 10, and never in the
  session that created the save (`loadInfo.source === 'none'`).
- Nothing is scheduled unless the player opted in **and** the system permission is granted (`S.notif.enabled`
  and `notify.permission === 'granted'`). Declining the card, or the system dialog, keeps everything off.
- Settings, Account tab: a master switch and one switch per type. Turning the master on when the system
  permission was never asked triggers the system dialog; when it is denied the rows are dimmed with a hint.
- One stable id per type (1001, 1002, 1003), so a reschedule replaces rather than stacks. At most three pending.
- Android alarms are inexact (`isExactNotification: false`), so the "Alarms & reminders" system screen never
  opens. Android 13+ asks for the notification permission through the plugin's `requestPermissions`.
- Nothing is scheduled closer than 15 minutes away.

## When it reschedules

`reschedule()` cancels everything and schedules the plan from the current state: at boot once the permission is
known, on every foreground/background change, after opting in, and after any switch changes. The plan itself is
pure (`src/meta/notify-core.ts`, `plan(input)`), so `tests/notify.test.ts` drives it with a fixed clock.

## Deep links

Every notification carries `extra.type`. The plugin's `localNotificationActionPerformed` listener calls
`openDeepLink(type)`, which clears any pending screens and opens the target above. If the tap arrives before
the game has a level, it is deferred a tick.

## Web

The web build cannot fire a notification once the tab is closed, so its backend (`webNotify` in
`src/platform/notifications.ts`) only records what would have been scheduled. Settings say so. The dev API and
the smoke test use it: `__SJ.notify.state()`, `.optIn()`, `.setEnabled(on)`, `.setType(type, on)`,
`.pending()`, `.tap(type)`, `.reset()`.

## Not verified here

The native path (`@capacitor/local-notifications` 8.3) has not been exercised on a device from this machine.
Both native builds compile in the Mobile workflow.
