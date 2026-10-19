import badgirlArt from '../assets/shows/badgirl.jpg';
import gongziArt from '../assets/shows/gongzi.jpg';
import sunnydayArt from '../assets/shows/sunnyday.jpg';
import wanniArt from '../assets/shows/wanni.jpg';
import westairArt from '../assets/shows/westair.jpg';
import type { ShowId } from '../types/recording';

/** 節目色調：由節目圖抽色，全部深色（來源：mockup Palette artboard） */
export interface ShowTheme {
    bg: string;
    surface: string;
    track: string;
    accent: string;
    /** 強調色底上面嘅文字 / icon */
    onAccent: string;
    title: string;
    text: string;
    muted: string;
    shadowDark: string;
    shadowLight: string;
    art: string;
}

export const NEUTRAL_THEME: ShowTheme = {
    bg: '#141414',
    surface: '#1e1e1e',
    track: '#333333',
    accent: '#f2f2f2',
    onAccent: '#141414',
    title: '#ffffff',
    text: '#f2f2f2',
    muted: '#a3a3a3',
    shadowDark: '#0a0a0a',
    shadowLight: '#242424',
    art: '',
};

/**
 * 主頁色調：跟 app icon（design/app-icon.png）——柔藍底、奶油色泥膠字、黃色點綴。
 * NEUTRAL_THEME 仲係 :root 同搵唔到節目時嘅後備，所以另開一個，唔改中性色。
 * bg 係漸變頂色（漸變本身見 tokens.css --home-bg-*）。
 */
export const HOME_THEME: ShowTheme = {
    bg: '#4f749c',
    surface: '#42658a',
    // 節目圖邊框用漸變底色，幾乎隱形，唔會好似中性色嘅深灰框咁搶眼
    track: '#42658a',
    accent: '#f5d294',
    onAccent: '#2f4560',
    // #fdf8f2 喺 #4f749c 上有 4.61:1，「903 PLAYER」細字都過到 WCAG AA
    title: '#fdf8f2',
    text: '#fdf8f2',
    // 版本號喺頁底（漸變底色 #42658a），#e6eef7 有 5.18:1
    muted: '#e6eef7',
    shadowDark: '#30506f',
    shadowLight: '#5a7fa8',
    art: '',
};

export const SHOW_THEMES: Record<ShowId, ShowTheme> = {
    badgirl: {
        bg: '#21151a',
        surface: '#2e1e24',
        track: '#4a3540',
        accent: '#f08a24',
        onAccent: '#21151a',
        title: '#f6c987',
        text: '#f6eee8',
        muted: '#c2aaa6',
        shadowDark: '#160d11',
        shadowLight: '#352329',
        art: badgirlArt,
    },
    gongzi: {
        bg: '#111111',
        surface: '#1c1b19',
        track: '#3a372f',
        accent: '#d4af5a',
        onAccent: '#111111',
        title: '#f2e3b3',
        text: '#f2f0ea',
        muted: '#aba79c',
        shadowDark: '#080808',
        shadowLight: '#24231f',
        art: gongziArt,
    },
    wanni: {
        bg: '#1c1c1e',
        surface: '#28282b',
        track: '#424247',
        // 刻意用 #f26b5f 而唔係 mockup 嘅 #EF5548：#EF5548 喺 surface #28282b 上只有 4.24:1，
        // #f26b5f 有 4.93:1（bg 上 5.71:1），文字達到 WCAG AA 4.5:1
        accent: '#f26b5f',
        onAccent: '#1c1c1e',
        title: '#f4f1ec',
        text: '#f4f1ec',
        muted: '#afafb5',
        shadowDark: '#121214',
        shadowLight: '#2f2f33',
        art: wanniArt,
    },
    sunnyday: {
        bg: '#0e2230',
        surface: '#16303f',
        track: '#2c4a5c',
        accent: '#6ec6ea',
        onAccent: '#0e2230',
        title: '#e3f5ff',
        text: '#eef7fb',
        muted: '#9fbacb',
        shadowDark: '#081620',
        shadowLight: '#1c3a4b',
        art: sunnydayArt,
    },
    westair: {
        bg: '#2a1420',
        surface: '#3a1d2b',
        track: '#573043',
        accent: '#ff8a65',
        onAccent: '#2a1420',
        title: '#ffd3b8',
        text: '#fff1ea',
        muted: '#d3a9b4',
        shadowDark: '#1d0c15',
        shadowLight: '#442331',
        art: westairArt,
    },
};

export const themeFor = (showId: ShowId | undefined): ShowTheme =>
    showId ? SHOW_THEMES[showId] : NEUTRAL_THEME;

const THEME_KEYS: Record<Exclude<keyof ShowTheme, 'art'>, string> = {
    bg: '--theme-bg',
    surface: '--theme-surface',
    track: '--theme-track',
    accent: '--theme-accent',
    onAccent: '--theme-on-accent',
    title: '--theme-title',
    text: '--theme-text',
    muted: '--theme-muted',
    shadowDark: '--theme-shadow-dark',
    shadowLight: '--theme-shadow-light',
};

/** 將色調轉成 CSS custom properties，套喺頁面 root */
export const themeVars = (theme: ShowTheme): Record<string, string> =>
    Object.fromEntries(
        Object.entries(THEME_KEYS).map(([key, cssVar]) => [
            cssVar,
            theme[key as keyof typeof THEME_KEYS],
        ]),
    );
