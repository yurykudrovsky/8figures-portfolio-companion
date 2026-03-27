import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eighfigures.app',
  appName: '8Figures',
  webDir: 'dist/frontend/browser',
  server: {
    androidScheme: 'http',
  },
};

export default config;
