// Import theme images
import springBg from '../assets/themes/spring.png'
import summerBg from '../assets/themes/summer.png'
import autumnBg from '../assets/themes/autumn.png'
import winterBg from '../assets/themes/winter.png'
import cairoBg from '../assets/themes/cairo.png'
import londonBg from '../assets/themes/london.png'
import laBg from '../assets/themes/la.png'
import moscowBg from '../assets/themes/moscow.png'
import seoulBg from '../assets/themes/seoul.png'
import busanBg from '../assets/themes/busan.png'
import jejuBg from '../assets/themes/jeju.png'
import gyeongjuBg from '../assets/themes/gyeongju.png'
import gwangjuBg from '../assets/themes/gwangju.png'
import tokyoBg from '../assets/themes/tokyo.png'
import beijingBg from '../assets/themes/beijing.png'
import hongkongBg from '../assets/themes/hongkong.png'
import bangkokBg from '../assets/themes/bangkok.png'
import hanoiBg from '../assets/themes/hanoi.png'

export interface ThemeOption {
    id: string;
    nameKey: string;
    color: string;
    colorClass: string; // Added for Tailwind safelist
    textColor?: string;
    bg?: string;
    overlay?: string;
}

export const THEMES: {
    colors: ThemeOption[];
    seasonal: ThemeOption[];
    city: ThemeOption[];
} = {
    colors: [
        { id: 'blue', nameKey: 'settings.colorTheme.blue', color: 'blue', colorClass: 'bg-blue-500' },
        { id: 'sky', nameKey: 'settings.colorTheme.sky', color: 'sky', colorClass: 'bg-sky-500' },
        { id: 'teal', nameKey: 'settings.colorTheme.teal', color: 'teal', colorClass: 'bg-teal-500' },
        { id: 'green', nameKey: 'settings.colorTheme.forest', color: 'green', colorClass: 'bg-green-500' },
        { id: 'lime', nameKey: 'settings.colorTheme.lime', color: 'lime', colorClass: 'bg-lime-500' },
        { id: 'orange', nameKey: 'settings.colorTheme.sunset', color: 'orange', colorClass: 'bg-orange-500' },
        { id: 'red', nameKey: 'settings.colorTheme.red', color: 'red', colorClass: 'bg-red-500' },
        { id: 'pink', nameKey: 'settings.colorTheme.berry', color: 'pink', colorClass: 'bg-pink-500' },
        { id: 'purple', nameKey: 'settings.colorTheme.purple', color: 'purple', colorClass: 'bg-purple-500' },
        { id: 'indigo', nameKey: 'settings.colorTheme.indigo', color: 'indigo', colorClass: 'bg-indigo-500' },
        { id: 'gray', nameKey: 'settings.colorTheme.gray', color: 'gray', colorClass: 'bg-gray-500' },
    ],

    seasonal: [
        {
            id: 'spring',
            nameKey: 'settings.seasonal.spring',
            color: 'pink',
            colorClass: 'bg-pink-500',
            bg: springBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'summer',
            nameKey: 'settings.seasonal.summer',
            color: 'blue',
            colorClass: 'bg-blue-500',
            bg: summerBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'autumn',
            nameKey: 'settings.seasonal.autumn',
            color: 'orange',
            colorClass: 'bg-orange-500',
            bg: autumnBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'winter',
            nameKey: 'settings.seasonal.winter',
            color: 'sky',
            colorClass: 'bg-sky-500',
            bg: winterBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
    ],

    city: [
        {
            id: 'cairo',
            nameKey: 'settings.city.cairo',
            color: 'orange',
            colorClass: 'bg-orange-500',
            bg: cairoBg,
            overlay: 'bg-white/70 dark:bg-black/50'
        },
        {
            id: 'london',
            nameKey: 'settings.city.london',
            color: 'sky',
            colorClass: 'bg-sky-500',
            bg: londonBg,
            overlay: 'bg-white/70 dark:bg-black/50'
        },
        {
            id: 'la',
            nameKey: 'settings.city.la',
            color: 'purple',
            colorClass: 'bg-purple-500',
            bg: laBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'moscow',
            nameKey: 'settings.city.moscow',
            color: 'indigo',
            colorClass: 'bg-indigo-500',
            bg: moscowBg,
            overlay: 'bg-white/60 dark:bg-black/50'
        },
        {
            id: 'seoul',
            nameKey: 'settings.city.seoul',
            color: 'blue',
            colorClass: 'bg-blue-600',
            bg: seoulBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'busan',
            nameKey: 'settings.city.busan',
            color: 'sky',
            colorClass: 'bg-sky-500',
            bg: busanBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'jeju',
            nameKey: 'settings.city.jeju',
            color: 'green',
            colorClass: 'bg-green-500',
            bg: jejuBg,
            overlay: 'bg-white/60 dark:bg-black/30'
        },
        {
            id: 'gyeongju',
            nameKey: 'settings.city.gyeongju',
            color: 'orange',
            colorClass: 'bg-orange-600',
            bg: gyeongjuBg,
            overlay: 'bg-white/60 dark:bg-black/50'
        },
        {
            id: 'gwangju',
            nameKey: 'settings.city.gwangju',
            color: 'teal',
            colorClass: 'bg-teal-600',
            bg: gwangjuBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'tokyo',
            nameKey: 'settings.city.tokyo',
            color: 'pink',
            colorClass: 'bg-pink-500',
            bg: tokyoBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'beijing',
            nameKey: 'settings.city.beijing',
            color: 'red',
            colorClass: 'bg-red-600',
            bg: beijingBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'hongkong',
            nameKey: 'settings.city.hongkong',
            color: 'purple',
            colorClass: 'bg-purple-600',
            bg: hongkongBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'bangkok',
            nameKey: 'settings.city.bangkok',
            color: 'orange',
            colorClass: 'bg-orange-500',
            bg: bangkokBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
        {
            id: 'hanoi',
            nameKey: 'settings.city.hanoi',
            color: 'green',
            colorClass: 'bg-green-600',
            bg: hanoiBg,
            overlay: 'bg-white/60 dark:bg-black/40'
        },
    ]
}
