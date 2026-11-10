/*
 * 由驗證好嘅 DramaDefinition 展開成每一集（DramaEpisode），包括砌好錄音 URL 同 episode ID。
 * 已儲進度 / 收藏（localStorage v2）用 episode ID 做 key，URL 淨係播放用；
 * v1 舊資料用 URL 做 key，storageMigration 靠呢度砌出嚟嘅 URL 對返 ID。
 */
import { DRAMA_AUDIO_BASE } from '../constants';
import type { DailyEpisode, DramaEpisode, DramaId, SeriesEpisode } from '../types/drama';
import { dailyEpisodeId, seriesEpisodeId } from '../core/episodeId';
import { arcLabelField, isArcEnabled } from './arcLabel';
import { batchDateOf } from './availabilitySchema';
import { displayTitle, encodePath, renderFileName, toChineseNumeral } from './filename';
import type {
    ArcDefinition,
    AudioDefinition,
    DailyDefinition,
    DramaDefinition,
    SeriesDefinition,
} from './schema';

const FILE_NO_WIDTH = 2;

/**
 * 用家（player / backend）注入嘅設定：package 唔讀 import.meta.env，唔依賴 Vite。
 * appAudioBase = host: app 嘅錄音 base（要以 / 結尾），player 傳 `${BASE_URL}dramas/`；
 * backend 驗 catalog 時傳固定值（只驗結構，唔用 URL）。只影響 host: app 嘅 URL，episode ID 唔受影響
 */
export interface EpisodeBuildOptions {
    appAudioBase: string;
    /**
     * 下架（enabled: false）嘅短篇都砌埋：backend 嘅 publish ID 守衛用（落架唔係刪，ID 唔當消失）；
     * player 唔設，下架短篇唔出
     */
    includeDisabledArcs?: boolean;
}

/** 呢個短篇要唔要砌集數 */
export const arcIncluded = (
    arc: { enabled?: boolean },
    options?: { includeDisabledArcs?: boolean },
) => options?.includeDisabledArcs === true || isArcEnabled(arc);

const audioBase = (audio: AudioDefinition, options: EpisodeBuildOptions): string =>
    audio.host === 'r2' ? `${DRAMA_AUDIO_BASE}/` : options.appAudioBase;

/** <base><folder>/<segments…>，每段 encode */
const audioUrl = (
    audio: AudioDefinition,
    segments: readonly string[],
    options: EpisodeBuildOptions,
): string => `${audioBase(audio, options)}${encodePath([audio.folder, ...segments])}`;

const seriesTokens = (audio: AudioDefinition, arc: ArcDefinition, no: number, title: string) => ({
    no: String(no),
    no2: String(no).padStart(FILE_NO_WIDTH, '0'),
    noZh: toChineseNumeral(no),
    arc: arc.name,
    folder: audio.folder,
    title,
});

const definedDates = (dates: readonly (string | undefined)[]): string[] =>
    dates.filter((d): d is string => d !== undefined).sort();

/** 呢集幾時上架：劇集、短篇、逐集（episodeDates）三層最遲嗰個（YYYY-MM-DD 字串比較） */
const episodeAddedAt = (def: SeriesDefinition, arc: ArcDefinition, no: number) =>
    definedDates([def.addedAt, arc.addedAt, batchDateOf(arc.episodeDates, no, undefined)]).at(-1);

/** 呢集幾時下架：劇集、短篇、集數範圍三層最早嗰個 */
const episodeRemovedAt = (def: SeriesDefinition, arc: ArcDefinition, no: number) => {
    const range = arc.episodeRemovedAt.find((r) => no >= r.first && no <= r.last);
    return definedDates([def.removedAt, arc.removedAt, range?.date])[0];
};

const seriesEpisode = (
    dramaId: DramaId,
    def: SeriesDefinition,
    arc: ArcDefinition,
    no: number,
    options: EpisodeBuildOptions,
): SeriesEpisode => {
    const title = arc.titles.get(no);
    const file =
        arc.files.get(no) ??
        renderFileName(def.audio.file, seriesTokens(def.audio, arc, no, title ?? ''));
    const addedAt = episodeAddedAt(def, arc, no);
    const removedAt = episodeRemovedAt(def, arc, no);
    return {
        kind: 'series',
        dramaId,
        id: seriesEpisodeId(dramaId, arc.id, no),
        url: audioUrl(def.audio, [arc.name, file], options),
        arc: arc.name,
        ...arcLabelField(arc),
        no,
        ...(title ? { title: displayTitle(title) } : {}),
        ...(addedAt ? { addedAt } : {}),
        ...(removedAt ? { removedAt } : {}),
    };
};

const seriesEpisodes = (
    dramaId: DramaId,
    def: SeriesDefinition,
    options: EpisodeBuildOptions,
): SeriesEpisode[] =>
    def.arcs
        .filter((arc) => arcIncluded(arc, options))
        .flatMap((arc) =>
            // 未知集數（未上架、drama.json 未寫 episodes）就一集都唔砌
            Array.from({ length: arc.count ?? 0 }, (_, i) =>
                seriesEpisode(dramaId, def, arc, arc.firstNo + i, options),
            ),
        );

const dailyTokens = (audio: AudioDefinition, date: string) => ({
    date,
    yyyymmdd: date.replaceAll('-', ''),
    folder: audio.folder,
});

const dailyEpisodes = (
    dramaId: DramaId,
    def: DailyDefinition,
    options: EpisodeBuildOptions,
): DailyEpisode[] =>
    def.episodes.map(({ date, rerun, file }) => ({
        kind: 'daily',
        dramaId,
        id: dailyEpisodeId(dramaId, date),
        url: audioUrl(
            def.audio,
            [file ?? renderFileName(def.audio.file, dailyTokens(def.audio, date))],
            options,
        ),
        date,
        rerun,
        ...(def.removedAt ? { removedAt: def.removedAt } : {}),
    }));

/** 一套劇全部集數（短篇劇按短篇 → 集數排；每日劇照 JSON 次序） */
export const buildEpisodes = (
    dramaId: DramaId,
    def: DramaDefinition,
    options: EpisodeBuildOptions,
): DramaEpisode[] =>
    def.kind === 'series'
        ? seriesEpisodes(dramaId, def, options)
        : dailyEpisodes(dramaId, def, options);
