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
import {
    listAssetHashes,
    listEntries,
    listPublishes,
    publishDocument,
    publishDocuments,
    type PublishRow,
} from './store';

const POSITIVE_INT = /^[1-9]\d*$/;

/** ops 頁用嘅 camelCase；current = 最新嗰個（R2 而家嘅 catalog.json） */
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

/** 驗證 / commit；validator 拒絕 → 422 連原因 */
const publishValue = async (
    c: Context<AppEnv>,
    value: () => Promise<unknown>,
    rollbackOf: number | null,
) => {
    try {
        const validated = validateDocument(await value());
        const options = {
            createdBy: c.get('email'),
            force: c.req.query('force') === '1',
            rollbackOf,
        };
        const outcome = await commitPublish(c.env, validated, options);
        // 普通 publish 成功：搞掂咗嘅掃描 finding 標 resolved（還原唔算）
        if (outcome.kind === 'published' && rollbackOf === null)
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
    publishValue(
        c,
        async () =>
            documentFromEntries(await listEntries(c.env.DB), {
                origin: c.env.WORKER_ORIGIN,
                assets: await listAssetHashes(c.env.DB),
                generatedAt: new Date().toISOString(),
            }),
        null,
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

/** 還原 = 重新 publish 舊 snapshot（記做新一行，D1 entries 唔郁），一樣行 ID 守衛 */
publishRoutes.post('/publishes/:id/rollback', async (c) => {
    const id = c.req.param('id');
    const snapshot = POSITIVE_INT.test(id) ? await publishDocument(c.env.DB, Number(id)) : null;
    if (!snapshot) return c.json({ error: 'no such publish' }, HTTP_STATUS.notFound);
    return publishValue(c, async () => JSON.parse(snapshot) as unknown, Number(id));
});
