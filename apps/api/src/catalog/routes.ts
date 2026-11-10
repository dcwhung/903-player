/* /api/publish、/api/publishes、/api/publishes/:id/rollback（已經過 session + same-origin 守門） */
import { Hono, type Context } from 'hono';
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
        return respond(c, await commitPublish(c.env, validated, options));
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
    const rows = await listPublishes(c.env.DB);
    return c.json({ publishes: rows.map((row, index) => summary(row, index === 0)) });
});

/** 還原 = 重新 publish 舊 snapshot（記做新一行，D1 entries 唔郁），一樣行 ID 守衛 */
publishRoutes.post('/publishes/:id/rollback', async (c) => {
    const id = c.req.param('id');
    const snapshot = POSITIVE_INT.test(id) ? await publishDocument(c.env.DB, Number(id)) : null;
    if (!snapshot) return c.json({ error: 'no such publish' }, HTTP_STATUS.notFound);
    return publishValue(c, async () => JSON.parse(snapshot) as unknown, Number(id));
});
