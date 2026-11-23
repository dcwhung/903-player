/*
 * 已發佈版本（0.11.0；GET /api/entries/:kind/:id 嘅 published、還原 revert.ts）：最新 ok publish document
 * 入面嗰個 entry；document 讀唔到 / parse 唔到 / 冇佢 → null（fail closed：唔出還原）。
 * - S-1006：parse 咗嘅 document 按「最新 publish 嘅 id + hash」memo 住（isolate 內），連續 GET N 個 entry 只
 *   讀 + parse 一次；有新 publish（id 變）就重讀。publishes 行嘅 document 寫咗唔會再改（hash = 佢嘅 sha256）
 * - S-1009：圖 URL 唔係 <origin>/catalog/v1/img/<name> → 呢個檔「解唔到」（unresolvedImages），還原唔郁 D1 嘅 key；
 *   只係俾 revert 用，GET 淨係回 entry（definition + images）
 */
import type { CatalogKind } from '@903-player/catalog';
import { latestPublishKey, publishDocument } from '../catalog/store';
import { CATALOG_IMAGE_PATH } from '../config';
import { isRecord, type Json } from './http';

export interface PublishedEntry {
    definition: Json;
    /** 同 D1 entries.images 一樣係「檔名 → <hash>.<ext>」（document 嘅絕對 URL 轉返） */
    images: Json;
}

export interface PublishedSource {
    /** definition 同 cache 共用（S-1006）：唔准改，要改就 structuredClone */
    entry: PublishedEntry;
    /** document 有呢個檔、但 URL 解唔返 <hash>.<ext>：還原時唔郁 D1 嗰個 key（fail closed） */
    unresolvedImages: ReadonlySet<string>;
}

/** 圖 URL（<origin>/catalog/v1/img/<name>）→ <name>；唔係呢個格式 → undefined */
const imageNameOf = (url: unknown): string | undefined => {
    if (typeof url !== 'string') return undefined;
    const at = url.lastIndexOf(CATALOG_IMAGE_PATH);
    return at === -1 ? undefined : url.slice(at + CATALOG_IMAGE_PATH.length) || undefined;
};

const sourceOf = (definition: Json, rawImages: unknown): PublishedSource => {
    const images: Json = {};
    const unresolvedImages = new Set<string>();
    Object.entries(isRecord(rawImages) ? rawImages : {}).forEach(([file, url]) => {
        const name = imageNameOf(url);
        if (name === undefined) unresolvedImages.add(file);
        else images[file] = name;
    });
    return { entry: { definition, images }, unresolvedImages };
};

/** parse 咗嘅 document 入面 kind + id 嗰個 entry；冇佢 → null */
const sourceIn = (document: unknown, kind: CatalogKind, id: string): PublishedSource | null => {
    const list: unknown = isRecord(document) ? document[kind] : undefined;
    const entry = (Array.isArray(list) ? (list as unknown[]) : []).find(
        (item) => isRecord(item) && item.id === id,
    );
    if (!isRecord(entry) || !isRecord(entry.definition)) return null;
    return sourceOf(entry.definition, entry.images);
};

const parseOrNull = (text: string | null): unknown => {
    if (text === null) return null;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
};

/** 最近一份 parse 咗嘅 document（parse 唔到 = null，同樣 cache 住：同一份 document 結果唔會變） */
let memo: { key: string; document: unknown } | null = null;

const latestDocument = async (db: D1Database): Promise<unknown> => {
    const latest = await latestPublishKey(db);
    if (!latest) return null;
    const key = `${String(latest.id)}:${latest.hash}`;
    if (memo?.key !== key)
        memo = { key, document: parseOrNull(await publishDocument(db, latest.id)) };
    return memo.document;
};

/** 最新 ok publish 嘅呢個 entry + 解唔到嘅圖（未 publish 過 / 讀唔到 / 冇佢 = null） */
export const loadPublishedSource = async (
    db: D1Database,
    kind: CatalogKind,
    id: string,
): Promise<PublishedSource | null> => sourceIn(await latestDocument(db), kind, id);

/**
 * 成批查（GET /api/entries?detail=1，AU-024）：最新 document 只讀一次，
 * 回傳嘅 lookup 逐個 entry 查都唔再掂 D1
 */
export const loadPublishedLookup = async (db: D1Database) => {
    const document = await latestDocument(db);
    return (kind: CatalogKind, id: string): PublishedSource | null => sourceIn(document, kind, id);
};
