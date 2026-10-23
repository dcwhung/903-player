/*
 * ⚠️ 假資料：廣播劇錄音仲未 host，主題 / 集數 / 日子都係由截圖砌出嚟嘅樣本，只係畀 UI 用。
 * 真資料到咗（芝See 固定清單、18樓C座 manifest）就換走呢個檔，介面（dramaEpisodesOf 等）唔使變。
 * 網址指去 public/dramas/ 底下（將來放錄音嘅位置），而家未有檔案，撳播放會一直「連線中…」。
 */
import type { DailyEpisode, DramaEpisode, DramaId, SeriesEpisode } from '../types/drama';

const AUDIO_EXTENSION = '.m4a';
const audioUrl = (dramaId: DramaId, file: string): string =>
    `${import.meta.env.BASE_URL}dramas/${dramaId}/${file}${AUDIO_EXTENSION}`;

/** 只知道「X時mas時小提議」四集嘅標題（截圖），其他主題嘅集名用「待定」頂住 */
const KNOWN_TITLES: Readonly<Record<string, readonly string[]>> = {
    X時mas時小提議: ['休養下', '你洽我', '索腳汗', '返個人'],
};
const EPISODES_PER_ARC = 4;
const PLACEHOLDER_TITLE = '待定';

const CHISEE_ARCS = [
    '我哋覺得我哋窮',
    'X時mas時小提議',
    '你生日所以我生日',
    '大妒忌',
    '好朋友手牽手',
    '小苦妹撲水',
    '我們都在會考中成長',
    '游乾水',
    '苦榮去做GYM',
    '青春期',
    '青春期真神奇',
] as const;

const chiseeEpisodes = (): SeriesEpisode[] =>
    CHISEE_ARCS.flatMap((arc, arcIndex) =>
        Array.from({ length: EPISODES_PER_ARC }, (_, i): SeriesEpisode => {
            const no = i + 1;
            return {
                kind: 'series',
                dramaId: 'chisee',
                url: audioUrl('chisee', `${arcIndex + 1}-${no}`),
                arc,
                no,
                title: KNOWN_TITLES[arc]?.[i] ?? PLACEHOLDER_TITLE,
            };
        }),
    );

/** 截圖見到嘅日子；2025-08 嗰幾集係重播 */
const C18_EPISODES: readonly { date: string; rerun?: boolean }[] = [
    { date: '2026-10-23' },
    { date: '2026-10-22' },
    { date: '2026-10-21' },
    { date: '2026-10-20' },
    { date: '2026-10-16' },
    { date: '2026-10-15' },
    { date: '2025-08-13', rerun: true },
    { date: '2025-08-12', rerun: true },
    { date: '2025-08-11', rerun: true },
];

const c18Episodes = (): DailyEpisode[] =>
    C18_EPISODES.map(({ date, rerun = false }) => ({
        kind: 'daily',
        dramaId: 'c18',
        url: audioUrl('c18', date.replaceAll('-', '')),
        date,
        rerun,
    }));

const CATALOG: Readonly<Record<DramaId, readonly DramaEpisode[]>> = {
    chisee: chiseeEpisodes(),
    c18: c18Episodes(),
};

/** 某套劇全部集數（主題劇集按主題 → 集數排；每日劇集次序唔保證，用 dailyNewestFirst 排） */
export const dramaEpisodesOf = (dramaId: DramaId): readonly DramaEpisode[] => CATALOG[dramaId];

export const seriesEpisodesOf = (dramaId: DramaId): SeriesEpisode[] =>
    dramaEpisodesOf(dramaId).filter((e): e is SeriesEpisode => e.kind === 'series');

export const dailyEpisodesOf = (dramaId: DramaId): DailyEpisode[] =>
    dramaEpisodesOf(dramaId).filter((e): e is DailyEpisode => e.kind === 'daily');
