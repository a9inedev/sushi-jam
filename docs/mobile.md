# Sushi Jam on iOS and Android

The native apps are Capacitor 8 shells around the single-file web build. The web build stays the source of truth: `npm run build` produces `dist/index.html`, and `npx cap sync` copies it into both native projects.

| Item                   | Where                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| App id                 | `com.a9inedev.sushijam` (placeholder, change before the first store upload)                     |
| Config                 | `capacitor.config.ts`                                                                           |
| Android project        | `android/` (Gradle, AGP 8, JDK 21, compile SDK 36)                                              |
| iOS project            | `ios/App/App.xcodeproj` (Swift Package Manager, no CocoaPods)                                   |
| Icons and splash       | Generated from `resources/*.svg` by `node tools/gen-assets.mjs`                                 |
| Platform layer in code | `src/platform/native.ts` (haptics, keep-awake, status bar, splash, back button, app state)      |
| CI                     | `.github/workflows/mobile.yml` builds the debug APK artifact and compiles iOS for the simulator |

## What the wrap does

- **Portrait lock.** Android: `android:screenOrientation="portrait"` on `MainActivity` in `android/app/src/main/AndroidManifest.xml`. iOS: `UISupportedInterfaceOrientations` is portrait only (iPad allows upside down) in `ios/App/App/Info.plist`.
- **Safe areas.** `#wrap` is padded with `env(safe-area-inset-*)` and the canvas is scaled to fit inside that padding, so the notch and the home indicator never overlap the game. The viewport meta already has `viewport-fit=cover`.
- **Status bar.** Hidden at launch on both platforms (`StatusBar.hide()` plus `UIStatusBarHidden` and `UIViewControllerBasedStatusBarAppearance=false` on iOS). The web view overlays the system bars.
- **Splash.** Native splash from `resources/splash.svg`, `launchAutoHide: false`; the game hides it right after its first frame is drawn.
- **Icons.** Every iOS and Android size, including the adaptive icon layers, from `resources/icon.svg`, `icon-foreground.svg` and `icon-background.svg`.
- **Haptics.** `@capacitor/haptics`: light impact on seating a diner, medium on a plate grab, heavy on a jam or spoiled wasabi, success notification on level clear. Toggle in Settings (gear button in the HUD, or from Pause). On the plain web build the same calls fall back to `navigator.vibrate` where the browser allows it.
- **Keep-awake.** `@capacitor-community/keep-awake` while a level is in play and no screen is open. Web fallback: the Screen Wake Lock API.
- **Back button (Android).** Closes the top screen, or opens Pause during play. It never exits the app mid-level. Ad, daily bonus and starter offer screens ignore it, since they have their own buttons.
- **Backgrounding.** When the app goes inactive during play, Pause opens so the player returns to a frozen board. Any open screen freezes the level.

## Windows PC: Android debug build

One-time setup on this machine (nothing is installed yet):

```powershell
winget install --id Google.AndroidStudio -e
```

Open Android Studio once, accept the SDK licences, and let it install the default SDK (platform 36, build tools, platform tools). Then set the environment for command-line builds (PowerShell, as the user):

```powershell
[Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Android\Android Studio\jbr', 'User')
```

Open a new terminal afterwards. Build and install:

```powershell
cd C:\Users\a9ine\Projects\sushi-jam
npm ci
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

The APK is at `android\app\build\outputs\apk\debug\app-debug.apk`. Install on a phone with USB debugging on:

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
```

Or let Capacitor pick the device: `npx cap run android` (from the repo root), or open the project in Android Studio with `npx cap open android` and press Run.

If you do not want the toolchain on this PC, the `Mobile` workflow on GitHub builds the same APK on every push that touches the app and attaches it as the `sushi-jam-debug-apk` artifact on the run page.

### Frame rate check on a phone

Connect the phone, open `chrome://inspect` in Chrome on the PC, inspect the Sushi Jam WebView, and use the Performance panel while playing a level with a full belt. The build should hold 60 fps on a mid-range 2019 or newer device; the canvas is capped at 2x device pixel ratio to keep fill rate in budget.

## Mac: iOS build

Requirements: macOS with Xcode 16 or newer (App Store), Node 22, and the command-line tools (`xcode-select --install`). No CocoaPods: the project uses Swift Package Manager.

```bash
cd sushi-jam
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode: select the `App` target, open **Signing & Capabilities**, pick your team. That is the only signing step. Then choose a device or simulator and press Run.

Unsigned command-line build for the simulator (this is what CI runs):

```bash
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
```

## Regenerating icons and splash

Edit the SVGs in `resources/`, then:

```bash
node tools/gen-assets.mjs
```

This rasterises them to `assets/*.png` (git-ignored) and runs `@capacitor/assets` into both native projects. Commit the changed files under `android/app/src/main/res` and `ios/App/App/Assets.xcassets`.

## Versions

- `package.json` `version` is shown on the Settings screen (injected at build time).
- Android: `versionCode` and `versionName` in `android/app/build.gradle`.
- iOS: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` on the App target in Xcode.

Bump all three together for a release.

## Known follow-ups

- Reminders: `@capacitor/local-notifications` is wired with inexact Android alarms; the native path has not been run on a device from this machine (docs/notifications.md).

- Leaderboards: the Game Center and Play Games plugin (`GameServicesPlugin`) has not been built on a device from this machine; the board ids and the Play Games project id are placeholders (docs/leaderboards.md).

- The Baloo 2 font is loaded from Google Fonts. Offline, the game falls back to Trebuchet MS. Bundle the font in the build during the art pass (Phase 1.1).
- Release signing (Android keystore, iOS distribution profile) is not set up. Debug builds only.
- `com.a9inedev.sushijam` is a placeholder id. Pick the final reverse-DNS id before creating the store listings; it appears in `capacitor.config.ts`, `android/app/build.gradle` and the Xcode project.
