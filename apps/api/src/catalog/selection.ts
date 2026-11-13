/*
 * 選擇發佈（api 0.10.0）：POST /api/publish / GET /api/changes 嘅 selection → 今次發佈邊啲新內容 + App 外觀。
 * 冇 selection = 舊行為（全部發佈）。有「必須處理」嘅行就算揀咗都自動剔走（skipped），唔係 422：
 * 更新頁同發佈之間有人改咗設定，都唔使成個發佈失敗；未知 key（頁面過時 / client bug）先 422
 */
import type { TodoRow } from '../admin/todos';
import { isRecord, type Json } from '../content/http';

export interface Appearance {
    icon: boolean;
    text: boolean;
    banner: boolean;
}

export interface PublishSelection {
    /** 今次要發佈嘅新內容：GET /api/todos 每行嘅 key */
    content: string[];
    appearance: Appearance;
}

/** body / query 格式唔啱：400 */
export class SelectionError extends Error {
    override readonly name = 'SelectionError';
}

/** 揀咗待辦冇嘅 key：422（乜都唔寫） */
export class UnknownSelectionError extends Error {
    override readonly name = 'UnknownSelectionError';
    constructor(readonly keys: string[]) {
        super('unknown selection keys');
    }
}

/** 乜都唔揀（GET /api/changes 嘅 others 用） */
export const EMPTY_SELECTION: PublishSelection = {
    content: [],
    appearance: { icon: false, text: false, banner: false },
};

/** content 上限：待辦行唔會多過呢個數，免得有人塞大 array */
const MAX_CONTENT_KEYS = 500;
const SELECTION_FIELDS: ReadonlySet<string> = new Set(['content', 'branding', 'banner']);
const BRANDING_FIELDS: ReadonlySet<string> = new Set(['icon', 'text']);

const onlyFields = (value: Json, allowed: ReadonlySet<string>, where: string): void => {
    const extra = Object.keys(value).filter((key) => !allowed.has(key));
    if (extra.length > 0) throw new SelectionError(`${where}: unknown field ${extra.join(', ')}`);
};

/** 冇 = false（冇揀） */
const flag = (value: unknown, where: string): boolean => {
    if (value === undefined) return false;
    if (typeof value !== 'boolean') throw new SelectionError(`${where} must be a boolean`);
    return value;
};

const contentOf = (value: unknown): string[] => {
    if (value === undefined) return [];
    const valid =
        Array.isArray(value) &&
        value.length <= MAX_CONTENT_KEYS &&
        value.every((key) => typeof key === 'string');
    if (!valid) throw new SelectionError('selection.content must be an array of strings');
    return [...new Set(value as string[])];
};

const brandingOf = (value: unknown): Pick<Appearance, 'icon' | 'text'> => {
    if (value === undefined) return { icon: false, text: false };
    if (!isRecord(value)) throw new SelectionError('selection.branding must be an object');
    onlyFields(value, BRANDING_FIELDS, 'selection.branding');
    return {
        icon: flag(value.icon, 'selection.branding.icon'),
        text: flag(value.text, 'selection.branding.text'),
    };
};

/** undefined = 冇 selection（舊行為）；欄位冇寫 = 冇揀 */
export const parseSelection = (value: unknown): PublishSelection | undefined => {
    if (value === undefined) return undefined;
    if (!isRecord(value)) throw new SelectionError('selection must be an object');
    onlyFields(value, SELECTION_FIELDS, 'selection');
    const banner = flag(value.banner, 'selection.banner');
    return {
        content: contentOf(value.content),
        appearance: { ...brandingOf(value.branding), banner },
    };
};

export interface SelectionPlan {
    /** 今次真係發佈嘅新內容 key（待辦行次序） */
    content: string[];
    /** 揀咗但未完成（有必須處理 / draft）：自動剔走 */
    skipped: { key: string; reason: 'incomplete' }[];
    unknown: string[];
    /** 唔入今次 catalog 嘅新劇 ID（換返上次發佈版本，冇就剔走） */
    excludedDramas: ReadonlySet<string>;
    /** 唔入今次 catalog 嘅新短篇：劇 ID → 短篇 ID */
    excludedArcs: ReadonlyMap<string, ReadonlySet<string>>;
    appearance: Appearance;
}

const excludedOf = (rows: readonly TodoRow[]) => {
    const dramas = new Set<string>();
    const arcs = new Map<string, Set<string>>();
    rows.forEach(({ kind, dramaId, arcId }) => {
        if (kind === 'newDrama') dramas.add(dramaId);
        else if (kind === 'newArc' && arcId !== null)
            arcs.set(dramaId, new Set([...(arcs.get(dramaId) ?? []), arcId]));
    });
    return { excludedDramas: dramas, excludedArcs: arcs };
};

export const planSelection = (
    rows: readonly TodoRow[],
    { content, appearance }: PublishSelection,
): SelectionPlan => {
    const picked = new Set(content);
    const keys = new Set(rows.map((row) => row.key));
    const published = rows.filter((row) => row.publish === 'selectable' && picked.has(row.key));
    const left = rows.filter((row) => row.publish !== 'always' && !published.includes(row));
    return {
        content: published.map((row) => row.key),
        skipped: left
            .filter((row) => picked.has(row.key))
            .map((row) => ({ key: row.key, reason: 'incomplete' as const })),
        unknown: content.filter((key) => !keys.has(key)),
        ...excludedOf(left),
        appearance,
    };
};

/** 今次發佈咗嘅待辦行（resolveDoneFindings 用）：揀咗嘅；always 行要佢個劇 / 短篇冇被剔走 */
export const publishedRows =
    (plan: SelectionPlan) =>
    (row: TodoRow): boolean => {
        if (row.publish !== 'always') return plan.content.includes(row.key);
        const arcs = plan.excludedArcs.get(row.dramaId);
        const arcLeftOut = row.arcId !== null && arcs?.has(row.arcId) === true;
        return !plan.excludedDramas.has(row.dramaId) && !arcLeftOut;
    };
