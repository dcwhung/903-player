/* D1 讀寫：entries / assets / publishes（SQL 全部 parameterized） */
import type { CatalogKind } from '@903-player/catalog';
import type { DeployState } from '../deploy/trigger';

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
    /** 'failed'：R2 寫唔到而且刪唔返嗰行（S-786）；唔計入 latestPublish */
    status: PublishStatus;
    /** failed 嘅原因（migration 0004；ok 行係 null） */
    error: string | null;
    /** 重新部署 player（migration 0006）：改咗 branding 先唔係 none */
    deploy: DeployState;
    /** 觸發部署嘅時間（ISO；none 係 null） */
    deploy_requested_at: string | null;
}

export type PublishStatus = 'ok' | 'failed';

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
    'id, created_at, created_by, hash, show_count, drama_count, episode_count, rollback_of, status, error, deploy, deploy_requested_at';

/**
 * Publish 用嘅 entries：按 id 排（同 buildCatalogJson.mjs folder 名排序一致，方便開 flag 前比較）；
 * draft（掃描自動建、未齊資料）唔包
 */
export const listEntries = async (db: D1Database): Promise<EntryRow[]> =>
    (
        await db
            .prepare(
                'SELECT kind, id, definition, images FROM entries WHERE draft = 0 ORDER BY kind, id',
            )
            .all<EntryRow>()
    ).results;

export interface NewAsset {
    hash: string;
    contentType: string;
    bytes: number;
    createdAt: string;
}

export const hasAsset = async (db: D1Database, hash: string): Promise<boolean> =>
    (await db.prepare('SELECT 1 AS found FROM assets WHERE hash = ?').bind(hash).first()) !== null;

/** 同一張圖兩個人同時上載：第二個 insert 乜都唔做（R2 object 內容一樣） */
export const insertAsset = async (db: D1Database, asset: NewAsset): Promise<void> => {
    await db
        .prepare(
            `INSERT INTO assets (hash, content_type, bytes, created_at) VALUES (?, ?, ?, ?)
             ON CONFLICT (hash) DO NOTHING`,
        )
        .bind(asset.hash, asset.contentType, asset.bytes, asset.createdAt)
        .run();
};

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

/** 而家 publish 緊嗰份（status = 'ok' 嘅最大 id）；未 publish 過 → null */
export const latestPublish = async (db: D1Database): Promise<LatestPublish | null> => {
    const row = await db
        .prepare(
            `SELECT ${SUMMARY_COLUMNS}, episode_ids, document FROM publishes
             WHERE status = 'ok' ORDER BY id DESC LIMIT 1`,
        )
        .first<PublishRow & { episode_ids: string; document: string }>();
    if (!row) return null;
    const { episode_ids: ids, document, ...summary } = row;
    return { row: summary, episodeIds: JSON.parse(ids) as string[], document };
};

export interface PublishedFactRow {
    kind: 'shows' | 'dramas';
    id: string;
    /** 短篇集嘅短篇 ID；每日播 / 節目 = null */
    arc: string | null;
}

/**
 * admin「未上架 / 已下架」用嘅「曾經上過架」（S-845、W-716）：一條 query，掃晒 ok publish，
 * 喺 D1 入面拆好先回（document 同 episode_ids 全文唔會傳返 Worker），每個劇 / 短篇 / 節目一行：
 * - 劇 / 短篇：任何一次 ok publish 嘅鎖住 episode ID（drama:<劇>:<短篇>:<集> / drama:<劇>:<日子>）
 * - 節目：任何一次 ok publish 嘅 document.shows 入面 enabled 唔係 false
 * JSON 唔合格嗰份（json_valid）跳過，唔會整爛個列表
 */
export const publishedFacts = async (db: D1Database): Promise<PublishedFactRow[]> =>
    (
        await db
            .prepare(
                `WITH ok AS (SELECT document, episode_ids FROM publishes WHERE status = 'ok'),
                 eps AS (
                     SELECT substr(e.value, 7) AS rest
                     FROM ok, json_each(ok.episode_ids) AS e
                     WHERE json_valid(ok.episode_ids) AND e.value LIKE 'drama:%'
                 ),
                 heads AS (
                     SELECT substr(rest, 1, instr(rest, ':') - 1) AS drama,
                            substr(rest, instr(rest, ':') + 1) AS tail
                     FROM eps WHERE instr(rest, ':') > 0
                 )
                 SELECT DISTINCT 'dramas' AS kind, drama AS id,
                        CASE WHEN instr(tail, ':') > 0
                             THEN substr(tail, 1, instr(tail, ':') - 1) END AS arc
                 FROM heads
                 UNION
                 SELECT DISTINCT 'shows' AS kind, json_extract(s.value, '$.id') AS id, NULL AS arc
                 FROM ok, json_each(ok.document, '$.shows') AS s
                 WHERE json_valid(ok.document)
                   AND json_type(s.value, '$.id') = 'text'
                   AND coalesce(json_extract(s.value, '$.definition.enabled'), 1) != 0`,
            )
            .all<PublishedFactRow>()
    ).results;

/** R2 寫失敗時收返啱啱 insert 嗰行（S-767） */
export const deletePublish = async (db: D1Database, id: number): Promise<void> => {
    await db.prepare('DELETE FROM publishes WHERE id = ?').bind(id).run();
};

/** 刪都刪唔到時退一步：標 failed（連原因），之後唔計入 latestPublish（S-786） */
export const markPublishFailed = async (
    db: D1Database,
    id: number,
    error: string,
): Promise<void> => {
    await db
        .prepare("UPDATE publishes SET status = 'failed', error = ? WHERE id = ?")
        .bind(error, id)
        .run();
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

/** 新到舊（唔包 document，admin 上下架記錄用） */
export const listPublishes = async (db: D1Database): Promise<PublishRow[]> =>
    (
        await db
            .prepare(`SELECT ${SUMMARY_COLUMNS} FROM publishes ORDER BY id DESC`)
            .all<PublishRow>()
    ).results;

/** 全部 publish 嘅 catalog.json（id → 全文；上下架記錄計 changes 用） */
export const publishDocuments = async (db: D1Database): Promise<Map<number, string>> =>
    new Map(
        (
            await db
                .prepare('SELECT id, document FROM publishes')
                .all<{ id: number; document: string }>()
        ).results.map((row) => [row.id, row.document]),
    );

/** 一次 publish 嘅摘要（部署狀態 / 重新部署用）；冇 = null */
export const findPublish = (db: D1Database, id: number): Promise<PublishRow | null> =>
    db
        .prepare(`SELECT ${SUMMARY_COLUMNS} FROM publishes WHERE id = ?`)
        .bind(id)
        .first<PublishRow>();

/** 記低部署觸發結果（publish 之後 / 重新部署） */
export const setPublishDeploy = async (
    db: D1Database,
    id: number,
    { deploy, requestedAt }: { deploy: DeployState; requestedAt: string },
): Promise<void> => {
    await db
        .prepare('UPDATE publishes SET deploy = ?, deploy_requested_at = ? WHERE id = ?')
        .bind(deploy, requestedAt, id)
        .run();
};

/** 還原用：snapshot + status（failed 嗰份從未上過 R2，唔准還原，S-797） */
export const publishSnapshot = (
    db: D1Database,
    id: number,
): Promise<{ document: string; status: PublishStatus } | null> =>
    db
        .prepare('SELECT document, status FROM publishes WHERE id = ?')
        .bind(id)
        .first<{ document: string; status: PublishStatus }>();

/* ───────────── 內容 API（Phase 2b-1）：單一 entry + 排程 ───────────── */

export interface StoredEntry extends EntryRow {
    /** ISO 時間：亦係 ETag（樂觀鎖） */
    updated_at: string;
    /** 1 = 掃描自動建、未齊資料（publish 唔包，PUT 寬鬆驗證） */
    draft: number;
}

const STORED_COLUMNS = 'kind, id, definition, images, updated_at, draft';

export const listStoredEntries = async (db: D1Database): Promise<StoredEntry[]> =>
    (await db.prepare(`SELECT ${STORED_COLUMNS} FROM entries ORDER BY kind, id`).all<StoredEntry>())
        .results;

export const getEntry = (db: D1Database, kind: string, id: string): Promise<StoredEntry | null> =>
    db
        .prepare(`SELECT ${STORED_COLUMNS} FROM entries WHERE kind = ? AND id = ?`)
        .bind(kind, id)
        .first<StoredEntry>();

/** 新增：已經有就乜都唔做（changes = 0 → 412）；draft 只係掃描自動建新劇先用 */
export const insertEntryStatement = (
    db: D1Database,
    row: EntryRow,
    updatedAt: string,
    draft = false,
) =>
    db
        .prepare(
            `INSERT INTO entries (kind, id, definition, images, updated_at, draft)
             VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (kind, id) DO NOTHING`,
        )
        .bind(row.kind, row.id, row.definition, row.images, updatedAt, draft ? 1 : 0);

/**
 * 樂觀鎖更新：updated_at 仲係 expected 先寫（changes = 0 → 412）。
 * draft 冇傳 = 唔郁（排程 / 掃描）；PUT 傳 false 清 draft
 */
export const updateEntryStatement = (
    db: D1Database,
    row: EntryRow,
    { expected, updatedAt, draft }: { expected: string; updatedAt: string; draft?: boolean },
) =>
    db
        .prepare(
            `UPDATE entries SET definition = ?, images = ?, updated_at = ?, draft = COALESCE(?, draft)
             WHERE kind = ? AND id = ? AND updated_at = ?`,
        )
        .bind(
            row.definition,
            row.images,
            updatedAt,
            draft === undefined ? null : Number(draft),
            row.kind,
            row.id,
            expected,
        );

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

/** 一套劇有排程嘅短篇 ID（S-804：改短篇 ID 前檢查） */
export const listScheduledArcIds = async (db: D1Database, dramaId: string): Promise<Set<string>> =>
    new Set(
        (
            await db
                .prepare('SELECT arc_id FROM schedules WHERE drama_id = ?')
                .bind(dramaId)
                .all<{ arc_id: string }>()
        ).results.map((row) => row.arc_id),
    );

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
 * 寫排程：一定緊接 updateEntryStatement 放同一個 batch（atomic）。changes() = 1 即係上一句 UPDATE
 * 真係寫咗（樂觀鎖贏咗）先寫規則：兩個 writer 同一 ms 計出同一個 updated_at 時，輸咗嗰個唔會冚走規則（W-703）
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
             SELECT ?, ?, ?, ? WHERE changes() = 1 AND EXISTS
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
