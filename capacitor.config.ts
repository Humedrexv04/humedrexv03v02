import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.humedrex.app',
  appName: 'Humedrex',
  webDir: 'dist/myapp/browser',
  plugins: { 
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
