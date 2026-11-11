/* 驗現有 drama.json（--existing / D1 definition）嘅形狀：壞咗要喺用之前停，唔好砌到一半 throw */
import { renderFileName } from '../dramas/filename';
import { dailyTokens, issue, seriesTokens } from './shared';
import type { DramaScan, Issue } from './types';
import type { ScanWording } from './wording';

/** 試砌一次 template 用嘅樣本日期（每日劇 token 要有日期先砌得） */
const SAMPLE_DATE = '2000-01-01';

type Kind = 'series' | 'daily';
type Json = Record<string, unknown>;

/** 每種劇嘅 list 欄位，同每項一定要有嘅識別欄位 */
const LIST_SHAPE: Record<Kind, [listKey: string, idKey: string]> = {
    series: ['arcs', 'name'],
    daily: ['episodes', 'date'],
};

export const isPlainObject = (value: unknown): value is Json =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const audioOf = (existing: Json): Json | undefined =>
    isPlainObject(existing.audio) ? existing.audio : undefined;

/** 試砌一次 audio.file：打錯 token 會 throw，要喺真正用之前轉做訊息 */
const templateProblem = (template: unknown, kind: Kind): string | undefined => {
    if (typeof template !== 'string') return '冇 audio.file（檔名 template）';
    const tokens = kind === 'series' ? seriesTokens('', '', 1, '') : dailyTokens('', SAMPLE_DATE);
    try {
        renderFileName(template, tokens);
        return undefined;
    } catch (error) {
        return `audio.file「${template}」有問題：${(error as Error).message}`;
    }
};

const listProblem = (existing: Json, kind: Kind): string | undefined => {
    const [listKey, idKey] = LIST_SHAPE[kind];
    const list = existing[listKey];
    if (list === undefined) return undefined;
    if (!Array.isArray(list)) return `${listKey} 唔係 list（要係 [ … ]）`;
    const bad = list.findIndex(
        (item: unknown) => !isPlainObject(item) || typeof item[idKey] !== 'string',
    );
    return bad === -1 ? undefined : `${listKey} 第 ${bad + 1} 項唔係 { "${idKey}": … }`;
};

/** existing 唔啱用（唔係 object、kind 唔夾、list / template 壞咗）就回傳原因 */
export const existingProblem = (
    existing: unknown,
    kind: Kind,
    wording: ScanWording,
): string | undefined => {
    const name = wording.existing;
    if (!isPlainObject(existing)) return `${name}唔係 drama.json（要係一個 { … } object）`;
    if (existing.kind !== kind)
        return `${name}係 ${(existing.kind as string | undefined) ?? '（冇 kind）'}，但 folder 睇落係 ${kind}`;
    const problem = listProblem(existing, kind) ?? templateProblem(audioOf(existing)?.file, kind);
    return problem === undefined ? undefined : `${name}嘅 ${problem}`;
};

/** existing 嘅 R2 folder 名同 listing 唔一樣：唔擋，但要講 */
export const existingFolderIssues = (
    scan: DramaScan,
    existing: Json,
    wording: ScanWording,
): Issue[] => {
    const audio = audioOf(existing);
    const folder = audio?.folder;
    if (audio?.host !== 'r2' || folder === scan.name) return [];
    const message = `${wording.existing}嘅 audio.folder「${String(folder)}」同${wording.folderName}唔一樣`;
    return [issue('warn', scan.name, message)];
};
