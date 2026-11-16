/*
 * Prebuild 下載共用細件（catalogSnapshot.ts 同 brandingIcons.ts）：timeout、HTTP 狀態、sha256 檔名驗證。
 * Worker 圖檔名一律 <sha256 前 16 hex>.<ext>（同 apps/api ASSET_HASH_HEX_LENGTH 一致）
 */
import { createHash } from 'node:crypto';

/** catalog.json 同每張圖各自嘅上限（Worker edge cache 通常一秒內） */
export const SNAPSHOT_FETCH_TIMEOUT_MS = 15_000;

const HASH_HEX_LENGTH = 16;

export const sha256Hex = (data: string | Uint8Array) =>
    createHash('sha256').update(data).digest('hex');

/** 內容 sha256 前 16 hex 係咪等於檔名嘅 hash 部分 */
export const matchesHashName = (bytes: Uint8Array, hash: string | undefined) =>
    sha256Hex(bytes).slice(0, HASH_HEX_LENGTH) === hash;

/** 夠鐘就 reject（就算 fetch 唔理 abort signal、或者 body 未下載完都計） */
export const withTimeout = async <T>(work: (signal: AbortSignal) => Promise<T>, ms: number) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new Error(`timed out after ${ms}ms`));
        }, ms);
    });
    try {
        return await Promise.race([work(controller.signal), timeout]);
    } finally {
        clearTimeout(timer);
    }
};

export const fetchOk = async (fetchImpl: typeof fetch, url: string, signal: AbortSignal) => {
    const response = await fetchImpl(url, { signal });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response;
};

/** 成個 body 做 bytes；timeout 包埋下載 body */
export const fetchBytes = (fetchImpl: typeof fetch, url: string, timeoutMs: number) =>
    withTimeout(
        async (signal) =>
            new Uint8Array(await (await fetchOk(fetchImpl, url, signal)).arrayBuffer()),
        timeoutMs,
    );
