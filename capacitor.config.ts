import type { CapacitorConfig } from '@capacitor/cli';

// appId is a placeholder reverse-DNS id. Change it before the first store upload; it is only referenced
// here, in android/app/build.gradle (applicationId/namespace) and in ios/App/App.xcodeproj (bundle id).
const config: CapacitorConfig = {
  appId: 'com.a9inedev.sushijam',
  appName: 'Sushi Jam',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#171512',
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: '#171512',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#171512',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
  },
};

export default config;
