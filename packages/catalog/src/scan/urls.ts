/* 由 drama.json 草稿砌錄音 / 封面網址（同 app 嘅 dramas/episodes.ts 一樣次序同寫法）：CLI --verify 用 */
import { DRAMA_AUDIO_BASE } from '../constants';
import { encodePath, renderFileName } from '../dramas/filename';
import {
    arcEpisodeFile,
    dailyTokens,
    episodeCountOf,
    firstNoOf,
    rangeOf,
    type AudioNaming,
} from './shared';
import type { DraftArc, DramaScan } from './types';

interface UrlJson extends AudioNaming {
    kind?: unknown;
    arcs?: readonly DraftArc[];
    episodes?: readonly { date: string; file?: string }[];
}

const dailyUrls = (json: UrlJson, prefix: string): string[] =>
    (json.episodes ?? []).map(
        ({ date, file }) =>
            `${prefix}/${encodeURIComponent(file ?? renderFileName(json.audio.file, dailyTokens(json.audio.folder, date)))}`,
    );

/** 每集錄音網址：daily 跟 episodes 次序；series 逐個短篇由 firstNo 起 */
export const episodeUrls = (draft: object, base: string = DRAMA_AUDIO_BASE): string[] => {
    const json = draft as UrlJson;
    const prefix = `${base}/${encodeURIComponent(json.audio.folder)}`;
    if (json.kind === 'daily') return dailyUrls(json, prefix);
    return (json.arcs ?? []).flatMap((arc) =>
        rangeOf(firstNoOf(arc), firstNoOf(arc) + (episodeCountOf(arc) ?? 0) - 1).map(
            (no) => `${prefix}/${encodePath([arc.name, arcEpisodeFile(json, arc, no)])}`,
        ),
    );
};

/** 封面網址：劇集層 + 每個短篇 folder 入面搵到嘅圖 */
export const coverUrls = (scan: DramaScan, folder: string, base: string = DRAMA_AUDIO_BASE) => [
    ...scan.covers.map((c) => `${base}/${encodePath([folder, c.normalize('NFC')])}`),
    ...scan.arcs.flatMap((arc) =>
        arc.covers.map((c) => `${base}/${encodePath([folder, arc.name, c.normalize('NFC')])}`),
    ),
];
