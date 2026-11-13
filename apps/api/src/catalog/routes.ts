/* /api/publish、/api/publishes、/api/publishes/:id/rollback（已經過 session + same-origin 守門） */
import { Hono, type Context } from 'hono';
import { publishChanges } from '../admin/publishChanges';
import { resolveDoneFindings } from '../admin/todos';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import {
    commitPublish,
    PublishValidationError,
    validateDocument,
    type PublishOutcome,
} from './publish';
import type { PublishWarning } from './warnings';
import { RollbackConflictError, RollbackNotRestorableError, rollbackToPublish } from './rollback';
import { publishedRows, type SelectionPlan } from './selection';
import {
    preparePublish,
    publishBodyLimit,
    selectionErrorResponse,
    selectionFromBody,
} from './selectivePublish';
import { listPublishes, publishDocuments, type PublishRow } from './store';

/** publish id path 參數（deploy/routes.ts 共用） */
export const POSITIVE_INT = /^[1-9]\d*$/;

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
    deploy: row.deploy,
    deployRequestedAt: row.deploy_requested_at,
    current,
});

/** warnings：普通 publish 先有（還原唔報，見 rollback.ts）；extra = 選擇發佈嘅 selection 結果 */
const respond = (
    c: Context<AppEnv>,
    outcome: PublishOutcome,
    { warnings, extra = {} }: { warnings?: PublishWarning[]; extra?: Record<string, unknown> } = {},
) => {
    if (outcome.kind === 'rejected')
        return c.json(
            { error: 'episode IDs would disappear', missing: outcome.missing },
            HTTP_STATUS.conflict,
        );
    const unchanged = outcome.kind === 'unchanged' ? { unchanged: true } : {};
    return c.json({
        ...unchanged,
        publish: summary(outcome.publish, true),
        ...(warnings ? { warnings } : {}),
        ...extra,
    });
};

/** publish 成功：今次真係發佈咗、搞掂咗嘅掃描 finding 標 resolved（還原唔算） */
const resolveAfterPublish = async (db: D1Database, publishId: number, plan?: SelectionPlan) => {
    try {
        await resolveDoneFindings(db, publishId, plan && publishedRows(plan));
    } catch (error) {
        // 已經上咗線：標唔到只係待辦行留低，唔好令 publish 回 500
        console.error(`publish ${publishId}: could not resolve findings`, error);
    }
};

/**
 * 普通 publish（body 選填 selection，見 selection.ts）：驗證 / commit；
 * selection 唔啱 → 400 / 422，validator 拒絕 → 422 連原因（還原見 rollback.ts）
 */
const publishSelected = async (c: Context<AppEnv>) => {
    try {
        const { value, plan } = await preparePublish(c.env, await selectionFromBody(c.req.raw));
        const validated = validateDocument(value);
        const options = {
            createdBy: c.get('email'),
            force: c.req.query('force') === '1',
            rollbackOf: null,
        };
        const outcome = await commitPublish(c.env, validated, options);
        if (outcome.kind === 'published')
            await resolveAfterPublish(c.env.DB, outcome.publish.id, plan);
        const extra = plan ? { selection: { content: plan.content, skipped: plan.skipped } } : {};
        return respond(c, outcome, { warnings: validated.warnings, extra });
    } catch (error) {
        const selectionError = selectionErrorResponse(c, error);
        if (selectionError) return selectionError;
        if (!(error instanceof PublishValidationError)) throw error;
        return c.json({ error: error.message }, HTTP_STATUS.unprocessable);
    }
};

export const publishRoutes = new Hono<AppEnv>();

publishRoutes.post('/publish', publishBodyLimit, publishSelected);

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
