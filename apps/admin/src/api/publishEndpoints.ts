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

export const publish = async (selection?: PublishSelection) =>
    (
        await request<PublishResult>('/api/publish', {
            method: 'POST',
            ...(selection ? { body: { selection } } : {}),
        })
    ).data;

/** 422 'unknown selection keys'（api 0.10.0）：selection 有待辦冇嘅 key = 頁面過時，要重新載入 */
const UNKNOWN_SELECTION_KEYS = 'unknown selection keys';

export const isStaleSelection = (error: unknown): boolean =>
    error instanceof ValidationError && error.message === UNKNOWN_SELECTION_KEYS;
