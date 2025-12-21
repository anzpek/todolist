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
  server: {
    url: 'https://anzpek.github.io/todolist/',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
