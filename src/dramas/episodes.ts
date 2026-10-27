/*
 * 由驗證好嘅 DramaDefinition 展開成每一集（DramaEpisode），包括砌好錄音 URL。
 * URL 砌法唔可以變：已儲進度（localStorage）用 URL 做 key。
 */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import type { DailyEpisode, DramaEpisode, DramaId, SeriesEpisode } from '../types/drama';
import { displayTitle, encodePath, renderFileName, toChineseNumeral } from './filename';
import type {
    ArcDefinition,
    AudioDefinition,
    DailyDefinition,
    DramaDefinition,
    SeriesDefinition,
} from './schema';

const FILE_NO_WIDTH = 2;
/** host: app 嘅錄音放喺 app 自己 public/dramas/<folder>/ */
const APP_AUDIO_DIR = 'dramas/';

const audioBase = (audio: AudioDefinition): string =>
    audio.host === 'r2' ? `${DRAMA_AUDIO_BASE}/` : `${import.meta.env.BASE_URL}${APP_AUDIO_DIR}`;

/** <base><folder>/<segments…>，每段 encode */
const audioUrl = (audio: AudioDefinition, segments: readonly string[]): string =>
    `${audioBase(audio)}${encodePath([audio.folder, ...segments])}`;

const seriesTokens = (audio: AudioDefinition, arc: ArcDefinition, no: number, title: string) => ({
    no: String(no),
    no2: String(no).padStart(FILE_NO_WIDTH, '0'),
    noZh: toChineseNumeral(no),
    arc: arc.name,
    folder: audio.folder,
    title,
});

const seriesEpisode = (
    dramaId: DramaId,
    def: SeriesDefinition,
    arc: ArcDefinition,
    no: number,
): SeriesEpisode => {
    const title = arc.titles.get(no);
    const file =
        arc.files.get(no) ??
        renderFileName(arc.file ?? def.audio.file, seriesTokens(def.audio, arc, no, title ?? ''));
    const addedAt = arc.addedAt ?? def.addedAt;
    return {
        kind: 'series',
        dramaId,
        url: audioUrl(def.audio, [arc.name, file]),
        arc: arc.name,
        no,
        ...(title ? { title: displayTitle(title) } : {}),
        ...(addedAt ? { addedAt } : {}),
    };
};

const seriesEpisodes = (dramaId: DramaId, def: SeriesDefinition): SeriesEpisode[] =>
    def.arcs.flatMap((arc) =>
        Array.from({ length: arc.count }, (_, i) =>
            seriesEpisode(dramaId, def, arc, arc.firstNo + i),
        ),
    );

const dailyTokens = (audio: AudioDefinition, date: string) => ({
    date,
    yyyymmdd: date.replaceAll('-', ''),
    folder: audio.folder,
});

const dailyEpisodes = (dramaId: DramaId, def: DailyDefinition): DailyEpisode[] =>
    def.episodes.map(({ date, rerun, file }) => ({
        kind: 'daily',
        dramaId,
        url: audioUrl(def.audio, [
            file ?? renderFileName(def.audio.file, dailyTokens(def.audio, date)),
        ]),
        date,
        rerun,
    }));

/** 一套劇全部集數（短篇劇按短篇 → 集數排；每日劇照 JSON 次序） */
export const buildEpisodes = (dramaId: DramaId, def: DramaDefinition): DramaEpisode[] =>
    def.kind === 'series' ? seriesEpisodes(dramaId, def) : dailyEpisodes(dramaId, def);
