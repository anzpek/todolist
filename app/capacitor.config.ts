import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anzpek.todolist',
  appName: 'TodoList',
  webDir: '../dist',
  // plugins: { ... } removed
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    }
  },
  android: {
  }
};

export default config;
