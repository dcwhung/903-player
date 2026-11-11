/*
 * 還原 #N（POST /api/publishes/:id/rollback，3c 用後回饋）：「還原上架狀態，之後新增嘅變下架」。
 * 用 snapshot #N 改 D1 嘅上架狀態，再經正常 publish 路徑發佈（rollbackOf = N）：
 * - admin 之後見到嘅 = 播放器見到嘅（GET /api/changes 冇差異，唔會出「待發佈」）
 * - 之後先加嘅節目 / 劇 / 短篇唔刪、設 enabled: false：集數 ID 仲喺 document，ID 守衛會過、收藏唔斷
 * 只改 `enabled`（節目、劇、短篇三層）；內容欄位（名、簡介、圖、集數、排程日期）保持而家嘅：
 * 還原集數會令鎖咗嘅 ID 消失，排程日期由 schedules 表計，淨改 definition 會唔夾。draft 唔郁。
 * 驗證 + ID 守衛喺寫 D1 之前先試；D1 一個 batch（樂觀鎖 + bump updated_at）；
 * 發佈 throw / 被拒就用另一個 batch 寫返舊 definition
 */
import { nextUpdatedAt } from '../content/etag';
import { isRecord, type Json } from '../content/http';
import {
    commitPublish,
    documentFromEntries,
    missingEpisodeIds,
    validateDocument,
    type PublishOutcome,
} from './publish';
import {
    latestPublish,
    listAssetHashes,
    listStoredEntries,
    publishSnapshot,
    updateEntryStatement,
    type StoredEntry,
} from './store';

type RollbackEnv = { DB: D1Database; CATALOG: R2Bucket; WORKER_ORIGIN: string };

/** 目標 publish 唔係 ok（failed = 從未上過 R2）：乜都唔寫，回 409（S-797） */
export class RollbackNotRestorableError extends Error {
    override readonly name = 'RollbackNotRestorableError';
}

/** 還原途中有人改咗 entry（樂觀鎖輸咗）：已經寫返舊值，回 412 */
export class RollbackConflictError extends Error {
    override readonly name = 'RollbackConflictError';
}

const keyOf = (kind: string, id: unknown) => `${kind}:${String(id)}`;

/** snapshot 入面每個 entry 嘅 definition（kind:id → definition） */
const snapshotDefinitions = (snapshot: string): Map<string, Json> => {
    const doc = JSON.parse(snapshot) as Json;
    return new Map(
        (['shows', 'dramas'] as const).flatMap((kind) =>
            (Array.isArray(doc[kind]) ? (doc[kind] as unknown[]) : [])
                .filter(isRecord)
                .map((entry): [string, Json] => [
                    keyOf(kind, entry.id),
                    isRecord(entry.definition) ? entry.definition : {},
                ]),
        ),
    );
};

/** enabled 跟 source（key 次序唔變，冇改就同原本一個 byte 都唔差）；source 冇呢個 key（= 預設）就刪走 */
const withEnabledOf = (target: Json, source: Json): Json => {
    if ('enabled' in source) return { ...target, enabled: source.enabled };
    const { enabled: _old, ...rest } = target;
    void _old;
    return rest;
};

const arcsOf = (definition: Json): unknown[] =>
    Array.isArray(definition.arcs) ? (definition.arcs as unknown[]) : [];

/**
 * 一個 entry 還原之後嘅 definition：snapshot 冇 = 下架；有 = enabled 跟 snapshot，
 * 短篇逐個（用 id 對）跟 snapshot，冇 = 之後先加 → 下架
 */
export const restoredDefinition = (current: Json, snapshot: Json | undefined): Json => {
    if (!snapshot) return { ...current, enabled: false };
    const next = withEnabledOf(current, snapshot);
    if (!Array.isArray(current.arcs)) return next;
    const before = new Map(
        arcsOf(snapshot)
            .filter(isRecord)
            .map((arc) => [arc.id, arc]),
    );
    const arcs = arcsOf(current).map((arc) => {
        if (!isRecord(arc)) return arc;
        const old = before.get(arc.id);
        return old ? withEnabledOf(arc, old) : { ...arc, enabled: false };
    });
    return { ...next, arcs };
};

interface Change {
    entry: StoredEntry;
    definition: string;
    updatedAt: string;
}

const planChanges = (entries: readonly StoredEntry[], snapshot: Map<string, Json>): Change[] =>
    entries
        .filter((entry) => entry.draft === 0)
        .flatMap((entry) => {
            const next = JSON.stringify(
                restoredDefinition(
                    JSON.parse(entry.definition) as Json,
                    snapshot.get(keyOf(entry.kind, entry.id)),
                ),
            );
            if (next === entry.definition) return [];
            return [{ entry, definition: next, updatedAt: nextUpdatedAt(entry.updated_at) }];
        });

/** 改完之後 publish 用嘅 rows（同 listEntries：唔包 draft、按 kind / id 排） */
const rowsAfter = (entries: readonly StoredEntry[], changes: readonly Change[]) => {
    const next = new Map(changes.map((c) => [keyOf(c.entry.kind, c.entry.id), c.definition]));
    return entries
        .filter((entry) => entry.draft === 0)
        .map((entry) => ({
            ...entry,
            definition: next.get(keyOf(entry.kind, entry.id)) ?? entry.definition,
        }));
};

interface Write {
    entry: StoredEntry;
    definition: string;
    expected: string;
    updatedAt: string;
}

/** 一個 batch（D1 batch = 一個 transaction）；回每行有冇寫到（樂觀鎖） */
const writeBatch = async (db: D1Database, writes: readonly Write[]): Promise<boolean[]> => {
    if (writes.length === 0) return [];
    const results = await db.batch(
        writes.map(({ entry, definition, expected, updatedAt }) =>
            updateEntryStatement(db, { ...entry, definition }, { expected, updatedAt }),
        ),
    );
    return results.map((result) => (result.meta.changes ?? 0) > 0);
};

/** 寫返舊 definition（只限我哋寫咗、之後冇人再改嗰啲；updated_at 再 bump） */
const revert = (db: D1Database, changes: readonly Change[], applied: readonly boolean[]) =>
    writeBatch(
        db,
        changes
            .filter((_, i) => applied[i] === true)
            .map((change) => ({
                entry: change.entry,
                definition: change.entry.definition,
                expected: change.updatedAt,
                updatedAt: nextUpdatedAt(change.updatedAt),
            })),
    );

const apply = async (db: D1Database, changes: readonly Change[]): Promise<boolean[]> => {
    const applied = await writeBatch(
        db,
        changes.map((change) => ({ ...change, expected: change.entry.updated_at })),
    );
    if (applied.every(Boolean)) return applied;
    await revert(db, changes, applied);
    throw new RollbackConflictError('entries changed during rollback, try again');
};

/** 改完之後嘅 document（驗證）+ ID 守衛：寫 D1 之前先試，唔過就乜都唔寫 */
const preflight = async (env: RollbackEnv, rows: ReturnType<typeof rowsAfter>, force: boolean) => {
    const validated = validateDocument(
        documentFromEntries(rows, {
            origin: env.WORKER_ORIGIN,
            assets: await listAssetHashes(env.DB),
            generatedAt: new Date().toISOString(),
        }),
    );
    const latest = await latestPublish(env.DB);
    const missing = latest ? missingEpisodeIds(latest.episodeIds, validated.episodeIds) : [];
    return { validated, missing: force ? [] : missing };
};

/**
 * 還原 #id：null = 冇呢次 publish。#id 唔係 ok throw RollbackNotRestorableError（409）；
 * 驗證唔過 throw PublishValidationError（422）；ID 守衛唔過回 rejected（409）；全部都喺寫 D1 之前。
 * R2 寫咗之後 purge cache 失敗唔會 throw（commitPublish 只 log，S-814），所以 revert 只會喺
 * R2 未寫 / 被拒時發生，D1 同已上線 catalog 唔會唔夾
 */
export const rollbackToPublish = async (
    env: RollbackEnv,
    id: number,
    { createdBy, force }: { createdBy: string; force: boolean },
): Promise<PublishOutcome | null> => {
    const snapshot = await publishSnapshot(env.DB, id);
    if (!snapshot) return null;
    if (snapshot.status !== 'ok')
        throw new RollbackNotRestorableError(`publish ${id} is not ok (${snapshot.status})`);
    const entries = await listStoredEntries(env.DB);
    const changes = planChanges(entries, snapshotDefinitions(snapshot.document));
    const { validated, missing } = await preflight(env, rowsAfter(entries, changes), force);
    if (missing.length > 0) return { kind: 'rejected', missing };
    const applied = await apply(env.DB, changes);
    try {
        const outcome = await commitPublish(env, validated, { createdBy, force, rollbackOf: id });
        if (outcome.kind === 'rejected') await revert(env.DB, changes, applied);
        return outcome;
    } catch (error) {
        await revert(env.DB, changes, applied);
        throw error;
    }
};
