/*
 * admin「檔名模板」下面嘅例子（3c production 回饋）：用而家嘅模板同第一集砌一個檔名，
 * 例如「我心不死 - 第 01 集.m4a」。短篇集 = 第一個短篇嘅第一集（firstNo、集名照用）；
 * 每日播 = 最早嗰日；冇 kind 當短篇集（同 schema 預設一樣）。
 * 例子係示範「模板」砌出嚟嘅樣，所以兩種劇都唔用逐集 file override（短篇 files、每日 episodes[].file，S-821）。
 * 模板有錯（未知 token、未閉合嘅 { / [，S-822）/ 冇嘢砌就 undefined（admin 唔顯示例子）
 */
import { renderFileName } from '../dramas/filename';
import { arcTemplateFile, dailyTokens, firstNoOf } from './shared';
import type { DraftArc } from './types';

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** 完整嘅 {token}，同入面冇括號嘅 [ … ] optional group */
const TOKEN = /\{\w+\}/g;
const GROUP = /\[[^[\]{}]*\]/g;
const BRACKET = /[{}[\]]/;

/**
 * renderFileName 遇到未閉合嘅「{no2 」「[ - {title}」會照字面砌出去（唔會 throw），
 * 例子就會變成怪檔名；先拆走完整 token 再拆走完整 group，仲有括號剩就當模板壞
 */
const isWellFormed = (template: string): boolean =>
    !BRACKET.test(template.replace(TOKEN, '').replace(GROUP, ''));

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
    if (!isRecord(audio) || typeof audio.file !== 'string' || !isWellFormed(audio.file))
        return undefined;
    const naming = { audio: { file: audio.file, folder: String(audio.folder ?? '') } };
    try {
        if (definition.kind === 'daily') {
            const date = firstDate(definition);
            return date === undefined
                ? undefined
                : renderFileName(audio.file, dailyTokens(naming.audio.folder, date));
        }
        const arc = firstArc(definition);
        return arc === undefined ? undefined : arcTemplateFile(naming, arc, firstNoOf(arc));
    } catch {
        return undefined;
    }
};
