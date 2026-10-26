import { LAUNCH_THEME_COLOR } from './launchTheme';

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
