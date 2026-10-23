/*
 * 廣播劇集數。
 * - 芝-See-菇-Bi-Family：真清單（10 個短篇、35 集，固定唔會再變），錄音喺 Cloudflare R2
 *   （DRAMA_AUDIO_BASE/芝-See-菇-Bi-Family/<短篇>/<原檔名>）。
 * - 18-樓-C-座：⚠️ 仲係假資料（由截圖抄嘅日子），網址係佔位（public/dramas/c18/），
 *   撳播放會一直「連線中…」；等 manifest 到咗先換。介面（dramaEpisodesOf 等）唔使變。
 */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import type { DailyEpisode, DramaEpisode, DramaId, SeriesEpisode } from '../types/drama';

/** 路徑每一段都 encode（空格、中文、全形字） */
const encodePath = (segments: readonly string[]): string =>
    segments.map(encodeURIComponent).join('/');

/** R2 入面芝See 嘅 folder（同劇名一樣） */
const CHISEE_FOLDER = '芝-See-菇-Bi-Family';

/** 檔名入面嘅集數用中文數字（第一集 … 第四集） */
const CHINESE_NUMERALS = ['一', '二', '三', '四'] as const;
const FILE_NO_WIDTH = 2;

/**
 * 原檔名：「01 - 短篇名 - 第一集.m4a」，有集名就加「 - 集名」
 * （例如「04 - Ｘ時mas時小提議 - 第四集 - 認認真真搵返個人.m4a」）
 */
const chiseeFile = (fileArc: string, no: number, title: string | undefined): string =>
    [
        String(no).padStart(FILE_NO_WIDTH, '0'),
        fileArc,
        `第${CHINESE_NUMERALS[no - 1] ?? no}集`,
        ...(title ? [title] : []),
    ].join(' - ') + '.m4a';

/**
 * 芝-See-菇-Bi-Family 短篇（按清單次序）：每集嘅集名，冇集名係 null。
 * arc = R2 folder 名（亦係畫面顯示嘅短篇名，照原寫法：全形「Ｘ」、「青春期眞神奇」）；
 * fileArc = 檔名入面嘅短篇名，同 folder 唔同先要寫（「游乾水」folder 入面嘅檔名係「游亁水」）
 */
const CHISEE_ARCS: readonly {
    arc: string;
    fileArc?: string;
    titles: readonly (string | null)[];
}[] = [
    { arc: '你生日所以我生日', titles: [null, null, null] },
    { arc: '大妒忌', titles: [null, null, null] },
    { arc: '好朋友手牽手', titles: ['好傾朋友', '朋友不同', '朋友性別', '朋友第一'] },
    { arc: '小苦妹撲水', titles: [null, null, null, null] },
    { arc: '我們都在會考中成長', titles: ['能源的故事', '舊底的故事'] },
    { arc: '游乾水', fileArc: '游亁水', titles: [null, null, null, null] },
    { arc: '苦榮去做GYM', titles: [null, null, null, null] },
    { arc: '青春期', titles: [null, null, null, null] },
    { arc: '青春期眞神奇', titles: ['男女先後', '多少問題', '時間長短'] },
    {
        arc: 'Ｘ時mas時小提議',
        titles: ['不如休養下', '哥哥你洽我', '著襪索腳汗', '認認真真搵返個人'],
    },
];

const chiseeEpisodes = (): SeriesEpisode[] =>
    CHISEE_ARCS.flatMap(({ arc, fileArc = arc, titles }) =>
        titles.map((title, i): SeriesEpisode => {
            const no = i + 1;
            return {
                kind: 'series',
                dramaId: 'chisee',
                url: `${DRAMA_AUDIO_BASE}/${encodePath([
                    CHISEE_FOLDER,
                    arc,
                    chiseeFile(fileArc, no, title ?? undefined),
                ])}`,
                arc,
                no,
                ...(title ? { title } : {}),
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
        url: `${import.meta.env.BASE_URL}dramas/c18/${date.replaceAll('-', '')}.m4a`,
        date,
        rerun,
    }));

const CATALOG: Readonly<Record<DramaId, readonly DramaEpisode[]>> = {
    chisee: chiseeEpisodes(),
    c18: c18Episodes(),
};

/** 某套劇全部集數（短篇劇集按短篇 → 集數排；每日劇集次序唔保證，用 dailyNewestFirst 排） */
export const dramaEpisodesOf = (dramaId: DramaId): readonly DramaEpisode[] => CATALOG[dramaId];

export const seriesEpisodesOf = (dramaId: DramaId): SeriesEpisode[] =>
    dramaEpisodesOf(dramaId).filter((e): e is SeriesEpisode => e.kind === 'series');

export const dailyEpisodesOf = (dramaId: DramaId): DailyEpisode[] =>
    dramaEpisodesOf(dramaId).filter((e): e is DailyEpisode => e.kind === 'daily');
