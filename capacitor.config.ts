import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.anzpek.todolist',
    appName: 'todolist',
    plugins: {
        FirebaseAuthentication: {
            skipNativeAuth: false,
            providers: ["google.com"]
        }
    },
    webDir: 'dist',
    server: {
        url: 'https://anzpek.github.io/todolist/',
        cleartext: true
    }
};

export default config;
