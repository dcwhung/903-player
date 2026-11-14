/*
 * 「曾經上過架」（admin 列表分「未上架」/「已下架」）同「最新 publish 有冇用緊」。
 * - 狀態：任何一次 ok publish（publishedFacts，一條 query）：劇 / 短篇 = 鎖住嘅 episode ID
 *   （上架過嘅集數，見 lockedEpisodeIds），節目 = enabled 唔係 false（W-716、S-845）
 * - 最新 ok publish（entries.ts isPublished，寬鬆驗證 mayRelax 用）：劇睇鎖住 ID，節目睇 document 有冇佢，
 *   讀唔到就當有（fail closed，S-844）
 * - DELETE 守衛（entries.ts blocksDelete）：劇同上；節目用「狀態」嘅曾經上過架（最新 document 讀唔到照拒絕）
 * - 已發佈版本（GET /api/entries/:kind/:id 嘅 published、還原 revert.ts）：最新 ok publish document 入面嗰個 entry，
 *   document 讀唔到 / 冇佢 → null（fail closed：唔出還原）
 */
import type { CatalogKind } from '@903-player/catalog';
import { latestPublish, type PublishedFactRow } from '../catalog/store';
import { CATALOG_IMAGE_PATH } from '../config';
import { isRecord, type Json } from './http';

export interface PublishedIndex {
    shows: ReadonlySet<string>;
    /** 劇 ID → 有鎖住集數嘅短篇 ID（每日播嘅第三段係日子，唔會對到短篇） */
    dramas: ReadonlyMap<string, ReadonlySet<string>>;
}

const EPISODE_ID_PARTS = { prefix: 0, drama: 1, arc: 2 } as const;

export const dramasOf = (episodeIds: readonly string[]): Map<string, Set<string>> => {
    const dramas = new Map<string, Set<string>>();
    episodeIds.forEach((episodeId) => {
        // drama:<劇 ID>:<短篇 ID>:<集數>（ID 合 ID_PATTERN，冇冒號）
        const parts = episodeId.split(':');
        const dramaId = parts[EPISODE_ID_PARTS.drama];
        if (parts[EPISODE_ID_PARTS.prefix] !== 'drama' || dramaId === undefined) return;
        const arcs = dramas.get(dramaId) ?? new Set<string>();
        const arcId = parts[EPISODE_ID_PARTS.arc];
        if (arcId !== undefined) arcs.add(arcId);
        dramas.set(dramaId, arcs);
    });
    return dramas;
};

const idOf = (show: unknown): string[] =>
    typeof show === 'object' && show !== null && 'id' in show && typeof show.id === 'string'
        ? [show.id]
        : [];

/** 最新 document 入面嘅節目 ID；parse 唔到 → null（叫嘅人要 fail closed） */
export const documentShowIds = (document: string): Set<string> | null => {
    try {
        const shows = (JSON.parse(document) as { shows?: unknown }).shows;
        return new Set((Array.isArray(shows) ? (shows as unknown[]) : []).flatMap(idOf));
    } catch {
        return null;
    }
};

export const isInIndex = (index: PublishedIndex, kind: 'shows' | 'dramas', id: string): boolean =>
    kind === 'shows' ? index.shows.has(id) : index.dramas.has(id);

/** publishedFacts 嘅行 → 索引（GET /api/entries） */
export const indexOfFacts = (rows: readonly PublishedFactRow[]): PublishedIndex => {
    const shows = new Set<string>();
    const dramas = new Map<string, Set<string>>();
    rows.forEach(({ kind, id, arc }) => {
        if (kind === 'shows') {
            shows.add(id);
            return;
        }
        const arcs = dramas.get(id) ?? new Set<string>();
        if (arc !== null) arcs.add(arc);
        dramas.set(id, arcs);
    });
    return { shows, dramas };
};

export interface PublishedEntry {
    definition: Json;
    /** 同 D1 entries.images 一樣係「檔名 → <hash>.<ext>」（document 嘅絕對 URL 轉返） */
    images: Json;
}

/** 圖 URL（<origin>/catalog/v1/img/<name>）→ <name>；唔係呢個格式 → undefined（唔還原呢張） */
const imageNameOf = (url: unknown): string | undefined => {
    if (typeof url !== 'string') return undefined;
    const at = url.lastIndexOf(CATALOG_IMAGE_PATH);
    return at === -1 ? undefined : url.slice(at + CATALOG_IMAGE_PATH.length) || undefined;
};

const imageNamesOf = (images: unknown): Json =>
    Object.fromEntries(
        Object.entries(isRecord(images) ? images : {}).flatMap(([file, url]) => {
            const name = imageNameOf(url);
            return name === undefined ? [] : [[file, name]];
        }),
    );

/** document 全文入面 kind + id 嗰個 entry；parse 唔到 / 冇佢 → null */
export const publishedEntryIn = (
    document: string,
    kind: CatalogKind,
    id: string,
): PublishedEntry | null => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(document);
    } catch {
        return null;
    }
    const list: unknown = isRecord(parsed) ? parsed[kind] : undefined;
    const entry = (Array.isArray(list) ? (list as unknown[]) : []).find(
        (item) => isRecord(item) && item.id === id,
    );
    if (!isRecord(entry) || !isRecord(entry.definition)) return null;
    return { definition: entry.definition, images: imageNamesOf(entry.images) };
};

/** 最新 ok publish 嘅呢個 entry（未 publish 過 = null） */
export const loadPublishedEntry = async (
    db: D1Database,
    kind: CatalogKind,
    id: string,
): Promise<PublishedEntry | null> => {
    const latest = await latestPublish(db);
    return latest ? publishedEntryIn(latest.document, kind, id) : null;
};
