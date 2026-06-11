import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.skinscopeai',
  appName: 'SkinScope AI',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    // For live-reload during development, set CAP_SERVER_URL
    url: process.env.CAP_SERVER_URL || undefined,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Camera: {
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
