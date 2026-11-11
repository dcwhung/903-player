/* /api/publish、/api/publishes、/api/publishes/:id/rollback（已經過 session + same-origin 守門） */
import { Hono, type Context } from 'hono';
import { publishChanges } from '../admin/changes';
import { resolveDoneFindings } from '../admin/todos';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import {
    commitPublish,
    documentFromEntries,
    PublishValidationError,
    validateDocument,
    type PublishOutcome,
} from './publish';
import { RollbackConflictError, RollbackNotRestorableError, rollbackToPublish } from './rollback';
import {
    listAssetHashes,
    listEntries,
    listPublishes,
    publishDocuments,
    type PublishRow,
} from './store';

const POSITIVE_INT = /^[1-9]\d*$/;

/** admin 用嘅 camelCase；current = 最新嗰個（R2 而家嘅 catalog.json） */
const summary = (row: PublishRow, current: boolean) => ({
    id: row.id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    hash: row.hash,
    showCount: row.show_count,
    dramaCount: row.drama_count,
    episodeCount: row.episode_count,
    rollbackOf: row.rollback_of,
    status: row.status,
    error: row.error,
    current,
});

const respond = (c: Context<AppEnv>, outcome: PublishOutcome) => {
    if (outcome.kind === 'rejected')
        return c.json(
            { error: 'episode IDs would disappear', missing: outcome.missing },
            HTTP_STATUS.conflict,
        );
    const unchanged = outcome.kind === 'unchanged' ? { unchanged: true } : {};
    return c.json({ ...unchanged, publish: summary(outcome.publish, true) });
};

/** 普通 publish：驗證 / commit；validator 拒絕 → 422 連原因（還原見 rollback.ts） */
const publishValue = async (c: Context<AppEnv>, value: () => Promise<unknown>) => {
    try {
        const validated = validateDocument(await value());
        const options = {
            createdBy: c.get('email'),
            force: c.req.query('force') === '1',
            rollbackOf: null,
        };
        const outcome = await commitPublish(c.env, validated, options);
        // publish 成功：搞掂咗嘅掃描 finding 標 resolved（還原唔算）
        if (outcome.kind === 'published')
            // 已經上咗線：標唔到只係待辦行留低，唔好令 publish 回 500
            await resolveDoneFindings(c.env.DB, outcome.publish.id).catch((error: unknown) =>
                console.error(`publish ${outcome.publish.id}: could not resolve findings`, error),
            );
        return respond(c, outcome);
    } catch (error) {
        if (!(error instanceof PublishValidationError)) throw error;
        return c.json({ error: error.message }, HTTP_STATUS.unprocessable);
    }
};

export const publishRoutes = new Hono<AppEnv>();

publishRoutes.post('/publish', (c) =>
    publishValue(c, async () =>
        documentFromEntries(await listEntries(c.env.DB), {
            origin: c.env.WORKER_ORIGIN,
            assets: await listAssetHashes(c.env.DB),
            generatedAt: new Date().toISOString(),
        }),
    ),
);

publishRoutes.get('/publishes', async (c) => {
    const [rows, documents] = await Promise.all([
        listPublishes(c.env.DB),
        publishDocuments(c.env.DB),
    ]);
    // 而家 publish 緊 = 最新一行 ok（failed 行冇寫到 R2，S-786）
    const currentId = rows.find((row) => row.status === 'ok')?.id;
    // 每行同之前最近一次 ok publish 比（上下架記錄，Phase 3a）
    const changes = publishChanges(rows, documents);
    return c.json({
        publishes: rows.map((row) => ({
            ...summary(row, row.id === currentId),
            changes: changes.get(row.id),
        })),
    });
});

/**
 * 還原 #N：snapshot #N 嘅上架狀態寫返 D1（之後新增嘅下架），再經正常 publish 發佈（rollbackOf = N），
 * 見 rollback.ts；驗證 / ID 守衛唔過乜都唔寫（422 / 409），#N 係 failed（從未上過 R2）→ 409（S-797），
 * 途中有人改 entry → 412
 */
publishRoutes.post('/publishes/:id/rollback', async (c) => {
    const id = c.req.param('id');
    if (!POSITIVE_INT.test(id)) return c.json({ error: 'no such publish' }, HTTP_STATUS.notFound);
    try {
        const outcome = await rollbackToPublish(c.env, Number(id), {
            createdBy: c.get('email'),
            force: c.req.query('force') === '1',
        });
        if (!outcome) return c.json({ error: 'no such publish' }, HTTP_STATUS.notFound);
        return respond(c, outcome);
    } catch (error) {
        if (error instanceof PublishValidationError)
            return c.json({ error: error.message }, HTTP_STATUS.unprocessable);
        if (error instanceof RollbackNotRestorableError)
            return c.json({ error: error.message }, HTTP_STATUS.conflict);
        if (error instanceof RollbackConflictError)
            return c.json({ error: error.message }, HTTP_STATUS.preconditionFailed);
        throw error;
    }
});
