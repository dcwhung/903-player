/*
 * 選擇發佈嘅 request 解析 + document 準備（POST /api/publish、GET /api/changes ?selection= 共用）
 */
import type { Context } from 'hono';
import { loadTodoRows, type TodoRow } from '../admin/todos';
import type { AppEnv } from '../app';
import { getBanner } from '../banner/store';
import { getBranding } from '../branding/store';
import { HTTP_STATUS } from '../config';
import { isRecord } from '../content/http';
import { documentFromEntries, type DocumentContext } from './publish';
import { selectedDocument } from './selectDocument';
import {
    parseSelection,
    planSelection,
    SelectionError,
    UnknownSelectionError,
    type PublishSelection,
    type SelectionPlan,
} from './selection';
import { latestPublish, listAssetHashes, listEntries, type EntryRow } from './store';

const parseJsonText = (text: string, where: string): unknown => {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new SelectionError(`${where} must be JSON`);
    }
};

/** POST /api/publish body：冇 body = 冇 selection（舊 admin 唔傳 body）；有就要係 JSON object */
export const selectionFromBody = async (
    request: Request,
): Promise<PublishSelection | undefined> => {
    const text = await request.text();
    if (text.trim() === '') return undefined;
    const body = parseJsonText(text, 'body');
    if (!isRecord(body)) throw new SelectionError('body must be a JSON object');
    return parseSelection(body.selection);
};

/** GET /api/changes?selection=<URL-encoded JSON>（同 body 嘅 selection 一樣 shape） */
export const selectionFromQuery = (query: string | undefined): PublishSelection | undefined =>
    query === undefined ? undefined : parseSelection(parseJsonText(query, 'selection'));

/** 待辦行 → plan；揀咗未知 key 就 throw（422，乜都唔寫） */
export const checkedPlan = (
    rows: readonly TodoRow[],
    selection: PublishSelection,
): SelectionPlan => {
    const plan = planSelection(rows, selection);
    if (plan.unknown.length > 0) throw new UnknownSelectionError(plan.unknown);
    return plan;
};

/** 有 plan 套用 selection，冇就舊行為（全部） */
export const documentFor = (
    rows: readonly EntryRow[],
    context: DocumentContext,
    selected: { plan: SelectionPlan; latestJson: string | undefined } | undefined,
): unknown =>
    selected
        ? selectedDocument(rows, context, selected.plan, selected.latestJson)
        : documentFromEntries(rows, context);

export interface PreparedPublish {
    value: unknown;
    plan: SelectionPlan | undefined;
}

/** D1 → 今次 publish 嘅 document（未驗證）+ plan */
export const preparePublish = async (
    env: { DB: D1Database; WORKER_ORIGIN: string },
    selection: PublishSelection | undefined,
): Promise<PreparedPublish> => {
    const plan = selection && checkedPlan(await loadTodoRows(env.DB), selection);
    const [rows, assets, banner, branding, latest] = await Promise.all([
        listEntries(env.DB),
        listAssetHashes(env.DB),
        getBanner(env.DB),
        getBranding(env.DB),
        latestPublish(env.DB),
    ]);
    const context = {
        origin: env.WORKER_ORIGIN,
        assets,
        generatedAt: new Date().toISOString(),
        banner,
        branding,
    };
    const selected = plan && { plan, latestJson: latest?.document };
    return { value: documentFor(rows, context, selected), plan };
};

/** selection 錯誤 → 400 / 422；其他錯誤回 undefined（caller 照 throw） */
export const selectionErrorResponse = (c: Context<AppEnv>, error: unknown) => {
    if (error instanceof SelectionError)
        return c.json({ error: error.message }, HTTP_STATUS.badRequest);
    if (error instanceof UnknownSelectionError)
        return c.json({ error: error.message, keys: error.keys }, HTTP_STATUS.unprocessable);
    return undefined;
};
