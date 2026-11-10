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

export interface LatestPublish {
    row: PublishRow;
    episodeIds: string[];
    /** catalog.json 全文 */
    document: string;
}

/** 而家 publish 緊嗰份（最大 id）；未 publish 過 → null */
export const latestPublish = async (db: D1Database): Promise<LatestPublish | null> => {
    const row = await db
        .prepare(
            `SELECT ${SUMMARY_COLUMNS}, episode_ids, document FROM publishes ORDER BY id DESC LIMIT 1`,
        )
        .first<PublishRow & { episode_ids: string; document: string }>();
    if (!row) return null;
    const { episode_ids: ids, document, ...summary } = row;
    return { row: summary, episodeIds: JSON.parse(ids) as string[], document };
};

/** R2 寫失敗時收返啱啱 insert 嗰行（S-767） */
export const deletePublish = async (db: D1Database, id: number): Promise<void> => {
    await db.prepare('DELETE FROM publishes WHERE id = ?').bind(id).run();
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

/* ───────────── 內容 API（Phase 2b-1）：單一 entry + 排程 ───────────── */

export interface StoredEntry extends EntryRow {
    /** ISO 時間：亦係 ETag（樂觀鎖） */
    updated_at: string;
}

export const listStoredEntries = async (db: D1Database): Promise<StoredEntry[]> =>
    (
        await db
            .prepare(
                'SELECT kind, id, definition, images, updated_at FROM entries ORDER BY kind, id',
            )
            .all<StoredEntry>()
    ).results;

export const getEntry = (db: D1Database, kind: string, id: string): Promise<StoredEntry | null> =>
    db
        .prepare(
            'SELECT kind, id, definition, images, updated_at FROM entries WHERE kind = ? AND id = ?',
        )
        .bind(kind, id)
        .first<StoredEntry>();

/** 新增：已經有就乜都唔做（changes = 0 → 412） */
export const insertEntryStatement = (db: D1Database, row: EntryRow, updatedAt: string) =>
    db
        .prepare(
            `INSERT INTO entries (kind, id, definition, images, updated_at) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (kind, id) DO NOTHING`,
        )
        .bind(row.kind, row.id, row.definition, row.images, updatedAt);

/** 樂觀鎖更新：updated_at 仲係 expected 先寫（changes = 0 → 412） */
export const updateEntryStatement = (
    db: D1Database,
    row: EntryRow,
    { expected, updatedAt }: { expected: string; updatedAt: string },
) =>
    db
        .prepare(
            `UPDATE entries SET definition = ?, images = ?, updated_at = ?
             WHERE kind = ? AND id = ? AND updated_at = ?`,
        )
        .bind(row.definition, row.images, updatedAt, row.kind, row.id, expected);

/** 刪 entry（expected = null 即係唔驗 If-Match）；劇集嘅排程一齊刪（同一個 batch） */
export const deleteEntry = async (
    db: D1Database,
    { kind, id, expected }: { kind: string; id: string; expected: string | null },
): Promise<boolean> => {
    const [deleted] = await db.batch([
        db
            .prepare(
                'DELETE FROM entries WHERE kind = ? AND id = ? AND (? IS NULL OR updated_at = ?)',
            )
            .bind(kind, id, expected, expected),
        db
            .prepare(
                `DELETE FROM schedules WHERE ? = 'dramas' AND drama_id = ?
                 AND NOT EXISTS (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ?)`,
            )
            .bind(kind, id, id),
    ]);
    return (deleted?.meta.changes ?? 0) > 0;
};

export interface ScheduleRow {
    rule: string;
    updated_at: string;
}

export const getSchedule = (
    db: D1Database,
    dramaId: string,
    arcId: string,
): Promise<ScheduleRow | null> =>
    db
        .prepare('SELECT rule, updated_at FROM schedules WHERE drama_id = ? AND arc_id = ?')
        .bind(dramaId, arcId)
        .first<ScheduleRow>();

/**
 * 寫排程：同 updateEntryStatement 放同一個 batch（atomic），而且只喺 entry 真係更新咗
 *（updated_at = 新值）先寫，樂觀鎖失敗就兩樣都唔寫
 */
export const upsertScheduleStatement = (
    db: D1Database,
    {
        dramaId,
        arcId,
        rule,
        updatedAt,
    }: { dramaId: string; arcId: string; rule: string; updatedAt: string },
) =>
    db
        .prepare(
            `INSERT INTO schedules (drama_id, arc_id, rule, updated_at)
             SELECT ?, ?, ?, ? WHERE EXISTS
               (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ? AND updated_at = ?)
             ON CONFLICT (drama_id, arc_id) DO UPDATE SET rule = excluded.rule,
               updated_at = excluded.updated_at`,
        )
        .bind(dramaId, arcId, rule, updatedAt, dramaId, updatedAt);

export const deleteSchedule = async (
    db: D1Database,
    dramaId: string,
    arcId: string,
): Promise<boolean> => {
    const result = await db
        .prepare('DELETE FROM schedules WHERE drama_id = ? AND arc_id = ?')
        .bind(dramaId, arcId)
        .run();
    return result.meta.changes > 0;
};
