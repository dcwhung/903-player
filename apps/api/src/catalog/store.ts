/* D1 讀寫：entries / assets / publishes（SQL 全部 parameterized） */
import type { CatalogKind } from '@903-player/catalog';

export interface EntryRow {
    kind: CatalogKind;
    id: string;
    /** JSON text */
    definition: string;
    /** JSON text：檔名 → R2 圖檔名 */
    images: string;
}

export interface PublishRow {
    id: number;
    created_at: string;
    created_by: string;
    hash: string;
    show_count: number;
    drama_count: number;
    episode_count: number;
    rollback_of: number | null;
}

export interface NewPublish {
    createdAt: string;
    createdBy: string;
    hash: string;
    document: string;
    episodeIds: readonly string[];
    showCount: number;
    dramaCount: number;
    episodeCount: number;
    rollbackOf: number | null;
}

const SUMMARY_COLUMNS =
    'id, created_at, created_by, hash, show_count, drama_count, episode_count, rollback_of';

/** 按 id 排：同 buildCatalogJson.mjs（folder 名排序）一致，方便開 flag 前比較 */
export const listEntries = async (db: D1Database): Promise<EntryRow[]> =>
    (
        await db
            .prepare('SELECT kind, id, definition, images FROM entries ORDER BY kind, id')
            .all<EntryRow>()
    ).results;

export const listAssetHashes = async (db: D1Database): Promise<Set<string>> =>
    new Set(
        (await db.prepare('SELECT hash FROM assets').all<{ hash: string }>()).results.map(
            (r) => r.hash,
        ),
    );

/** 而家 publish 緊嗰份（最大 id）嘅 episode ID；未 publish 過 → [] */
export const latestEpisodeIds = async (db: D1Database): Promise<string[]> => {
    const ids = await db
        .prepare('SELECT episode_ids FROM publishes ORDER BY id DESC LIMIT 1')
        .first<string>('episode_ids');
    return ids ? (JSON.parse(ids) as string[]) : [];
};

export const insertPublish = async (db: D1Database, row: NewPublish): Promise<PublishRow> => {
    const inserted = await db
        .prepare(
            `INSERT INTO publishes (created_at, created_by, hash, document, episode_ids, show_count,
             drama_count, episode_count, rollback_of) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING ${SUMMARY_COLUMNS}`,
        )
        .bind(
            row.createdAt,
            row.createdBy,
            row.hash,
            row.document,
            JSON.stringify(row.episodeIds),
            row.showCount,
            row.dramaCount,
            row.episodeCount,
            row.rollbackOf,
        )
        .first<PublishRow>();
    if (!inserted) throw new Error('publish insert returned no row');
    return inserted;
};

/** 新到舊（唔包 document，ops 頁 history 用） */
export const listPublishes = async (db: D1Database): Promise<PublishRow[]> =>
    (
        await db
            .prepare(`SELECT ${SUMMARY_COLUMNS} FROM publishes ORDER BY id DESC`)
            .all<PublishRow>()
    ).results;

export const publishDocument = (db: D1Database, id: number): Promise<string | null> =>
    db.prepare('SELECT document FROM publishes WHERE id = ?').bind(id).first<string>('document');
