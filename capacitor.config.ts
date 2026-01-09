import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.anzpek.todolist',
    appName: 'todolist',
    FirebaseAuthentication: {
        skipNativeAuth: false,
        providers: ["google.com"]
    },
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
