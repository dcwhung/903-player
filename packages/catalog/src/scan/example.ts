/*
 * admin「檔名模板」下面嘅例子（3c production 回饋）：用而家嘅模板同第一集砌一個檔名，
 * 例如「我心不死 - 第 01 集.m4a」。短篇集 = 第一個短篇嘅第一集（firstNo、集名、files 照用）；
 * 每日播 = 最早嗰日。模板有錯 / 冇嘢砌就 undefined（admin 唔顯示例子）
 */
import { renderFileName } from '../dramas/filename';
import { arcEpisodeFile, dailyTokens, firstNoOf } from './shared';
import type { DraftArc } from './types';

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const firstDate = (definition: Json): string | undefined =>
    (Array.isArray(definition.episodes) ? (definition.episodes as unknown[]) : [])
        .flatMap((e) => (isRecord(e) && typeof e.date === 'string' ? [e.date] : []))
        .sort()[0];

const firstArc = (definition: Json): DraftArc | undefined => {
    const arc = Array.isArray(definition.arcs) ? (definition.arcs as unknown[])[0] : undefined;
    return isRecord(arc) && typeof arc.name === 'string' ? (arc as unknown as DraftArc) : undefined;
};

export const exampleFileName = (definition: Json): string | undefined => {
    const audio = definition.audio;
    if (!isRecord(audio) || typeof audio.file !== 'string') return undefined;
    const naming = { audio: { file: audio.file, folder: String(audio.folder ?? '') } };
    try {
        if (definition.kind === 'daily') {
            const date = firstDate(definition);
            return date === undefined
                ? undefined
                : renderFileName(audio.file, dailyTokens(naming.audio.folder, date));
        }
        const arc = firstArc(definition);
        return arc === undefined ? undefined : arcEpisodeFile(naming, arc, firstNoOf(arc));
    } catch {
        return undefined;
    }
};
