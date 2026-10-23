import badgirlArt from '../assets/shows/badgirl.jpg';
import gongziArt from '../assets/shows/gongzi.jpg';
import lalalaArt from '../assets/shows/lalala.jpg';
import sunnydayArt from '../assets/shows/sunnyday.jpg';
import wanniArt from '../assets/shows/wanni.jpg';
import wavesArt from '../assets/shows/waves.jpg';
import westairArt from '../assets/shows/westair.jpg';
import { LAUNCH_THEME_COLOR } from './launchTheme';
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
    /** 淺色底（廣播劇）；冇就係深色（全部 903 節目） */
    scheme?: 'light';
    /**
     * 淺色底先要：iOS standalone 狀態列（black-translucent）一定係白字，
     * 頁頂安全區畫一條呢個色嘅色帶墊住白字；Android 工具列（theme-color）都用呢個色
     */
    statusBar?: string;
    /** 強調色做文字（播緊嗰集、現正播放標籤）；淺色底強調色太淺唔夠對比先另外設，冇就用 accent */
    accentText?: string;
    /** 頁頭標題字體（CSS font-family）；冇就跟 app 字體 */
    titleFont?: string;
    /** 頁頭底部裝飾線（CSS background，畫喺頁頭框底，唔佔高度）；冇就冇 */
    headerRule?: string;
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
 * bg 係漸變頂色（漸變本身見 tokens.css --home-bg-*）；app 喺主頁啟動，所以同時係啟動色。
 */
export const HOME_THEME: ShowTheme = {
    bg: LAUNCH_THEME_COLOR,
    surface: '#42658a',
    // 節目圖邊框用漸變底色，幾乎隱形，唔會好似中性色嘅深灰框咁搶眼
    track: '#42658a',
    accent: '#f5d294',
    onAccent: '#2f4560',
    // #fdf8f2 喺 #4f749c 上有 4.61:1，過到 WCAG AA。主頁而家冇文字標題：title 用喺掣嘅 focus ring
    // （global.css button:focus-visible），text 係 ThemeScope 嘅預設字色（冇自己顏色嘅文字承繼佢）
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
    // 深海藍底（浪）+ 標題字嘅紅
    waves: {
        bg: '#0c1a2c',
        surface: '#152a40',
        track: '#2a4560',
        accent: '#ff5a4e',
        onAccent: '#0c1a2c',
        title: '#dcefff',
        text: '#eef5fb',
        muted: '#9fb6cc',
        shadowDark: '#06101c',
        shadowLight: '#1b3450',
        art: wavesArt,
    },
    // 車身招牌嘅深綠松石底 + 標題字嘅橙黃
    lalala: {
        bg: '#0f2826',
        surface: '#173634',
        track: '#2e524e',
        accent: '#f7a531',
        onAccent: '#0f2826',
        title: '#ffe27a',
        text: '#f1f7f5',
        muted: '#a5c2bd',
        shadowDark: '#081a19',
        shadowLight: '#1d403d',
        art: lalalaArt,
    },
};

export const themeFor = (showId: ShowId | undefined): ShowTheme =>
    showId ? SHOW_THEMES[showId] : NEUTRAL_THEME;

type ColorKey = Exclude<keyof ShowTheme, 'art' | 'scheme' | 'statusBar' | OptionalVarKey>;
type OptionalVarKey = 'accentText' | 'titleFont' | 'headerRule';

const THEME_KEYS: Record<ColorKey, string> = {
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

/**
 * 可有可無嘅項目都一定輸出（用預設值）：ThemeScope 會一層包一層，
 * 唔輸出就會承繼外面嗰層（例如淺色劇集頁）嘅值
 */
const optionalVars = (theme: ShowTheme): Record<string, string> => ({
    '--theme-accent-text': theme.accentText ?? theme.accent,
    // 唔可以用 inherit：自訂屬性嘅 inherit 係承繼外層嘅 --theme-title-font，唔係字體
    '--theme-title-font': theme.titleFont ?? 'var(--font-family)',
    '--theme-header-rule': theme.headerRule ?? 'none',
});

/** 將色調轉成 CSS custom properties，套喺頁面 root */
export const themeVars = (theme: ShowTheme): Record<string, string> => ({
    ...Object.fromEntries(
        Object.entries(THEME_KEYS).map(([key, cssVar]) => [cssVar, theme[key as ColorKey]]),
    ),
    ...optionalVars(theme),
});
