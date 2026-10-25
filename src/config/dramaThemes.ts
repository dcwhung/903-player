import c18Disc from '../dramas/c18/disc.webp';
import c18Tile from '../dramas/c18/tile.webp';
import chiseeDisc from '../dramas/chisee/disc.webp';
import chiseeTile from '../dramas/chisee/tile.webp';
import goldenS1Disc from '../dramas/golden/season-1-disc.webp';
import goldenS2Disc from '../dramas/golden/season-2-disc.webp';
import goldenS3Disc from '../dramas/golden/season-3-disc.webp';
import goldenS4Disc from '../dramas/golden/season-4-disc.webp';
import goldenTile from '../dramas/golden/tile.webp';
import type { DramaEpisode, DramaId } from '../types/drama';
import { NEUTRAL_THEME, type ShowTheme } from './showThemes';

/**
 * 廣播劇色調：全部都係淺色（mockup design/previews/radio-drama-preview.html 方案 A）。
 * 碟面圖（art）係由劇集圖裁成正方嘅版本；文字色全部過 WCAG AA（dramaThemes.test.ts 檢查）
 */
export const DRAMA_THEMES: Record<DramaId, ShowTheme> = {
    // V1「亮黃底」：跟劇集圖黃底，主色橙（logo 字框），字深啡（梳化）
    chisee: {
        bg: '#ffeb85',
        surface: '#fff5c2',
        track: '#f5d23c',
        accent: '#f7901e',
        onAccent: '#2b1a0c',
        // 劇名 / 已收聽 / 播緊嗰集用深啲嘅橙，淺黃底上先夠 4.5:1
        title: '#a84800',
        accentText: '#a84800',
        text: '#3b2412',
        muted: '#7a5a20',
        shadowDark: '#e6cc5c',
        shadowLight: '#fff9dc',
        art: chiseeDisc,
        scheme: 'light',
        statusBar: '#a84800',
        // 頁頭底一行橙色圓點（卡通感）
        headerRule:
            'radial-gradient(circle, #f7901e 1.5px, transparent 2px) 0 100% / 8px 4px repeat-x',
    },
    // Tone 1「周記茶餐」：米黃餐牌紙 + 朱紅字，劇名用襯線粗體
    c18: {
        bg: '#f3e8d2',
        surface: '#e9d9b9',
        track: '#d3bd94',
        accent: '#c0362c',
        onAccent: '#fff8ec',
        title: '#a52a24',
        accentText: '#a52a24',
        text: '#3a2a20',
        muted: '#67533f',
        shadowDark: '#d9c8a6',
        shadowLight: '#fffaf0',
        art: c18Disc,
        scheme: 'light',
        statusBar: '#a52a24',
        titleFont: "'Noto Serif TC', serif",
        // 頁頭底兩條朱紅幼線（餐牌雙線）
        headerRule:
            'linear-gradient(#c0362c, #c0362c) 0 100% / 100% 1px no-repeat, ' +
            'linear-gradient(#c0362c, #c0362c) 0 calc(100% - 3px) / 100% 1px no-repeat',
    },
    // 「香檳金」：淺金底，主色跟 logo 黃，字深啡（mockup design/previews/golden-teenage-preview.html）；
    // 碟面跟季數（DRAMA_ARC_ART），呢度係後備
    golden: {
        bg: '#f7e7b4',
        surface: '#fdf3d3',
        track: '#e8c869',
        accent: '#f2c21b',
        onAccent: '#3a2600',
        title: '#7f5500',
        accentText: '#7f5500',
        text: '#3b2a0e',
        muted: '#6b5121',
        shadowDark: '#e0c77e',
        shadowLight: '#fff8e2',
        art: goldenS1Disc,
        scheme: 'light',
        statusBar: '#8a5c00',
        // 頁頭底一條金色漸變線（深金 → logo 黃 → 深金）
        headerRule: 'linear-gradient(90deg, #af7a08, #f2c21b, #af7a08) 0 100% / 100% 3px no-repeat',
    },
};

/** 短篇自己嘅碟面圖（key 係短篇名）；冇寫嘅短篇用返成套劇嘅 theme.art */
export const DRAMA_ARC_ART: Partial<Record<DramaId, Readonly<Record<string, string>>>> = {
    golden: {
        'Season 1': goldenS1Disc,
        'Season 2': goldenS2Disc,
        'Season 3': goldenS3Disc,
        'Season 4': goldenS4Disc,
    },
};

/** 某集嘅碟面：短篇有自己圖就用，冇就用劇集圖 */
export const dramaArtFor = (episode: DramaEpisode): string =>
    (episode.kind === 'series' && DRAMA_ARC_ART[episode.dramaId]?.[episode.arc]) ||
    DRAMA_THEMES[episode.dramaId].art;

/** 播緊某集時嘅色調：劇集色調 + 嗰集嘅碟面 */
export const dramaEpisodeTheme = (episode: DramaEpisode): ShowTheme => ({
    ...DRAMA_THEMES[episode.dramaId],
    art: dramaArtFor(episode),
});

/** 主頁劇集格用嘅原圖（16:9，已經有劇名） */
export const DRAMA_TILE_ART: Record<DramaId, string> = {
    chisee: chiseeTile,
    c18: c18Tile,
    golden: goldenTile,
};

export const dramaThemeFor = (dramaId: DramaId | undefined): ShowTheme =>
    dramaId ? DRAMA_THEMES[dramaId] : NEUTRAL_THEME;
