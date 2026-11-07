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
