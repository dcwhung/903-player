/*
 * 選擇發佈嘅 request 解析 + document 準備（POST /api/publish、GET /api/changes ?selection= 共用）
 */
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { loadTodoRows, type TodoRow } from '../admin/todos';
import type { AppEnv } from '../app';
import { getBanner } from '../banner/store';
import { getBranding } from '../branding/store';
import { HTTP_STATUS } from '../config';
import { isRecord } from '../content/http';
import { FingerprintError, parseFingerprint, StaleFingerprintError } from './fingerprint';
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
import { MAX_REPORTED_UNKNOWN_KEYS, PUBLISH_BODY_LIMIT_BYTES } from './selectionLimits';
import { latestPublish, listAssetHashes, listEntries, type EntryRow } from './store';

/** POST /api/publish 唔經 contentRoutes 嘅 256 KB limit：selection body 自己限 64 KB（S-980） */
export const publishBodyLimit = bodyLimit({
    maxSize: PUBLISH_BODY_LIMIT_BYTES,
    onError: (c) => c.json({ error: 'request body too large' }, HTTP_STATUS.payloadTooLarge),
});

const parseJsonText = (text: string, where: string): unknown => {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new SelectionError(`${where} must be JSON`);
    }
};

export interface PublishRequest {
    selection: PublishSelection | undefined;
    /** 確認頁睇到嗰份摘要嘅 fingerprint（AU-021，見 fingerprint.ts）；冇 = 唔檢查 */
    fingerprint: string | undefined;
}

/**
 * POST /api/publish body：冇 body = 冇 selection / fingerprint（舊 admin 唔傳 body）；有就要係 JSON object
 */
export const publishRequestFromBody = async (request: Request): Promise<PublishRequest> => {
    const text = await request.text();
    if (text.trim() === '') return { selection: undefined, fingerprint: undefined };
    const body = parseJsonText(text, 'body');
    if (!isRecord(body)) throw new SelectionError('body must be a JSON object');
    return {
        selection: parseSelection(body.selection),
        fingerprint: parseFingerprint(body.fingerprint),
    };
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
    /** 砌 document 時嘅最新 ok publish id（null = 未發佈過） */
    base: number | null;
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
    return { value: documentFor(rows, context, selected), plan, base: latest?.row.id ?? null };
};

/**
 * selection / fingerprint 格式錯誤 → 400、未知 key → 422（最多送返頭 20 個）、fingerprint 過時 → 412；
 * 其他錯誤回 undefined（caller 照 throw）
 */
export const selectionErrorResponse = (c: Context<AppEnv>, error: unknown) => {
    if (error instanceof StaleFingerprintError)
        return c.json({ error: error.message }, HTTP_STATUS.preconditionFailed);
    if (error instanceof SelectionError || error instanceof FingerprintError)
        return c.json({ error: error.message }, HTTP_STATUS.badRequest);
    if (error instanceof UnknownSelectionError)
        return c.json(
            { error: error.message, keys: error.keys.slice(0, MAX_REPORTED_UNKNOWN_KEYS) },
            HTTP_STATUS.unprocessable,
        );
    return undefined;
};
