import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.anzpek.todolist',
    appName: 'todolist',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
