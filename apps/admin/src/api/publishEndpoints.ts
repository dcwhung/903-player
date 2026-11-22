/* 確認發佈：變更摘要（可帶 selection）+ 發佈（api 0.10.0 選擇發佈；冇 selection = 全部發佈） */
import { ValidationError, request } from './client';
import type { ChangesResponse, PublishSelection, PublishSummary, SelectionResult } from './types';

export interface PublishResult {
    unchanged?: boolean;
    publish: PublishSummary;
    selection?: SelectionResult;
}

/** GET /api/changes[?selection=<URL-encoded JSON>] */
export const changesPath = (selection?: PublishSelection): string =>
    selection
        ? `/api/changes?${new URLSearchParams({ selection: JSON.stringify(selection) }).toString()}`
        : '/api/changes';

export const getChanges = async (selection?: PublishSelection) =>
    (await request<ChangesResponse>(changesPath(selection))).data;

/**
 * fingerprint（AU-021）：確認頁顯示緊嗰份摘要（GET /api/changes）嘅 fingerprint；server 而家會發佈嘅內容
 * 對唔上（中間有人儲存 / 發佈過）→ 412 VersionConflictError、乜都冇寫。舊 API 冇 = 唔送、唔檢查
 */
export const publish = async (selection?: PublishSelection, fingerprint?: string) => {
    const body = { ...(selection && { selection }), ...(fingerprint && { fingerprint }) };
    const hasBody = Object.keys(body).length > 0;
    return (
        await request<PublishResult>('/api/publish', {
            method: 'POST',
            ...(hasBody ? { body } : {}),
        })
    ).data;
};

/** 422 'unknown selection keys'（api 0.10.0）：selection 有待辦冇嘅 key = 頁面過時，要重新載入 */
const UNKNOWN_SELECTION_KEYS = 'unknown selection keys';

export const isStaleSelection = (error: unknown): boolean =>
    error instanceof ValidationError && error.message === UNKNOWN_SELECTION_KEYS;
