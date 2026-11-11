/*
 * R2 資料夾配對（admin「需要處理」/ 編輯頁 dropdown）：
 * - GET /api/folders/unmapped：AUDIO 頂層冇劇用緊嘅資料夾
 * - POST /api/dramas/:id/folder { folder }：劇集改用呢個資料夾 → 即刻重新掃描嗰套劇，同一個 batch 寫入；
 *   「資料夾唔見」finding 刪走。配對返同一個資料夾又冇新嘢（冇 diff）= 冇改動：200 + unchanged，
 *   entry 唔郁（updated_at / ETag 照舊），只刪 finding（S-801）
 */
import { hkToday } from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { getEntry, listStoredEntries, type StoredEntry } from '../catalog/store';
import { etagOf, expectedVersion } from '../content/etag';
import {
    badTarget,
    errorResponse,
    isRecord,
    preconditionFailed,
    readJsonObject,
    targetOf,
    type Json,
} from '../content/http';
import { deleteMissingFolderStatement, findingView, type FindingRow } from './findings';
import { listTopFolders } from './r2Folders';
import { planRescan, r2FolderOf } from './rescan';

export const folderRoutes = new Hono<AppEnv>();

const usedFolders = (entries: readonly StoredEntry[], except?: string): Set<string> =>
    new Set(
        entries
            .filter((entry) => entry.kind === 'dramas' && entry.id !== except)
            .flatMap((entry) => r2FolderOf(JSON.parse(entry.definition) as Json) ?? []),
    );

folderRoutes.get('/folders/unmapped', async (c) => {
    const [folders, entries] = await Promise.all([
        listTopFolders(c.env.AUDIO),
        listStoredEntries(c.env.DB),
    ]);
    const used = usedFolders(entries);
    return c.json({ folders: folders.filter((folder) => !used.has(folder)) });
});

/** 資料夾要喺 R2、冇其他劇用緊；回錯誤 response 或者 undefined（得） */
const folderProblem = async (c: Context<AppEnv>, dramaId: string, folder: string) => {
    const [folders, entries] = await Promise.all([
        listTopFolders(c.env.AUDIO),
        listStoredEntries(c.env.DB),
    ]);
    if (!folders.includes(folder))
        return errorResponse(c, HTTP_STATUS.unprocessable, `no folder ${folder} in R2`);
    if (usedFolders(entries, dramaId).has(folder))
        return errorResponse(c, HTTP_STATUS.conflict, `folder ${folder} is used by another drama`);
    return undefined;
};

const readFolder = async (c: Context<AppEnv>): Promise<string | undefined> => {
    const folder = (await readJsonObject(c))?.folder;
    return typeof folder === 'string' && folder !== '' && !folder.includes('/')
        ? folder
        : undefined;
};

/** 配得先回 entry + 現有 definition：404 / 412 / 422（唔係 r2 劇） */
const pairable = async (c: Context<AppEnv>, id: string) => {
    const entry = await getEntry(c.env.DB, 'dramas', id);
    if (!entry) return errorResponse(c, HTTP_STATUS.notFound, 'no such drama');
    const expected = expectedVersion(c.req.header('if-match'));
    if (expected !== null && expected !== entry.updated_at) return preconditionFailed(c);
    const stored = JSON.parse(entry.definition) as Json;
    if (!isRecord(stored.audio) || stored.audio.host !== 'r2')
        return errorResponse(c, HTTP_STATUS.unprocessable, 'audio.host must be r2 to use a folder');
    return { entry, stored, audio: stored.audio };
};

/** 冇 diff：entry 唔寫，淨刪「資料夾唔見」finding（entry 冇被人改過先刪） */
const keepUnchanged = async (c: Context<AppEnv>, entry: StoredEntry) => {
    await deleteMissingFolderStatement(c.env.DB, entry.id, entry.updated_at).run();
    const body = {
        unchanged: true,
        definition: JSON.parse(entry.definition) as Json,
        updatedAt: entry.updated_at,
        findings: [],
    };
    return c.json(body, HTTP_STATUS.ok, { etag: etagOf(entry.updated_at) });
};

/** 換資料夾 + 重新掃描，一個 batch 寫（連刪「資料夾唔見」finding） */
const commitPairing = async (
    c: Context<AppEnv>,
    { entry, stored, audio }: { entry: StoredEntry; stored: Json; audio: Json },
    folder: string,
) => {
    const now = new Date();
    const definition = { ...stored, audio: { ...audio, folder } };
    const options = { folder, today: hkToday(now), now: now.toISOString(), definition };
    const plan = await planRescan(c.env, entry, options);
    if (plan.errors.length > 0)
        return errorResponse(c, HTTP_STATUS.unprocessable, 'folder scan failed', {
            issues: plan.errors,
        });
    if (!plan.updatedAt) return keepUnchanged(c, entry);
    const clear = deleteMissingFolderStatement(c.env.DB, entry.id, plan.updatedAt);
    const results = await c.env.DB.batch([...plan.statements, clear]);
    if ((results[0]?.meta.changes ?? 0) === 0) return preconditionFailed(c);
    const rows = plan.findingIndexes.flatMap((i) => (results[i]?.results ?? []) as FindingRow[]);
    const body = {
        definition: plan.definition,
        updatedAt: plan.updatedAt,
        findings: rows.map(findingView),
    };
    return c.json(body, HTTP_STATUS.ok, { etag: etagOf(plan.updatedAt) });
};

folderRoutes.post('/dramas/:id/folder', async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const folder = await readFolder(c);
    if (folder === undefined)
        return errorResponse(
            c,
            HTTP_STATUS.badRequest,
            'body must be { folder } (a top-level folder name)',
        );
    const loaded = await pairable(c, target.id);
    if (loaded instanceof Response) return loaded;
    const problem = await folderProblem(c, target.id, folder);
    return problem ?? commitPairing(c, loaded, folder);
});
