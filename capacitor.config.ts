import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.aigm',
  appName: 'Narrative Engine',
  webDir: 'dist',
  android: {
    backgroundColor: '#0b0f12',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0f12',
    },
    Keyboard: {
      // 'native' makes the OS resize the WebView itself when the soft keyboard
      // opens. Combined with #root { height: 100dvh } (in index.css), dvh then
      // tracks the shrunk WebView and ChatInput lifts above the keyboard.
      // 'body' only set an inline <body> height, which #root's height overrode
      // — so the input stayed pinned behind the keyboard.
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;