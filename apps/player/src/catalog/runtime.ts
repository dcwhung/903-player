/*
 * 今次開 app 用邊份 catalog（Backend Phase 1）：開 app 時喺 splash 期間揀一次，之後成個 session 都唔換。
 * - 冇叫 initCatalog（VITE_CATALOG_URL 未設定 = 功能關住，亦係所有 unit test）：用內建資料（bundledSource，
 *   e2e build 包埋 e2e 測試劇），第一次用先 build，同 v1.29 一樣
 * - initCatalog：fetch catalog.json（最多 CATALOG_FETCH_TIMEOUT_MS）→ parse → 兩個 registry 都 build 到先用；
 *   任何一步唔得就 console.warn + 用內建資料（app 照開，唔會白畫面）
 * dramas/index.ts、shows/index.ts 嘅 module-level function 全部經呢度攞 registry，consumer 唔使知有呢層。
 */
import {
    buildRegistry,
    buildShowRegistry,
    documentSource,
    parseCatalogDocument,
    type DramaRegistry,
    type ShowRegistry,
} from '@903-player/catalog';
import { CATALOG_FETCH_TIMEOUT_MS } from '../config/catalogFetch';
import { bundledSource as bundledDramas } from './dramas/lib/bundledSource';
import { bundledSource as bundledShows } from './shows/lib/bundledSource';

export type CatalogOrigin = 'bundled' | 'remote';

export interface InitCatalogOptions {
    url: string;
    /** 預設 globalThis.fetch（test 注入） */
    fetchImpl?: typeof fetch;
    /** 預設 CATALOG_FETCH_TIMEOUT_MS */
    timeoutMs?: number;
}

interface Registries {
    dramas: DramaRegistry;
    shows: ShowRegistry;
}

const LOG_PREFIX = '[catalog]';

let remote: Registries | undefined;
let bundledDramaRegistry: DramaRegistry | undefined;
let bundledShowRegistry: ShowRegistry | undefined;
/** 有人讀過 registry：之後再換 source 會令同一個 session 前後資料唔一致 */
let registryRead = false;
let initStarted = false;

export const activeDramaRegistry = (): DramaRegistry => {
    registryRead = true;
    return remote?.dramas ?? (bundledDramaRegistry ??= buildRegistry(bundledDramas));
};

export const activeShowRegistry = (): ShowRegistry => {
    registryRead = true;
    return remote?.shows ?? (bundledShowRegistry ??= buildShowRegistry(bundledShows));
};

const currentOrigin = (): CatalogOrigin => (remote ? 'remote' : 'bundled');

/** 夠鐘就 reject（就算 fetch 唔理 abort signal、或者 body 未下載完都計） */
const withTimeout = <T>(work: Promise<T>, ms: number, onTimeout: () => void): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
            onTimeout();
            reject(new Error(`timed out after ${ms}ms`));
        }, ms);
    });
    return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
};

const fetchJson = async (url: string, fetchImpl: typeof fetch, signal: AbortSignal) => {
    // no-cache：HTTP cache 要 revalidate，唔好攞舊 catalog；離線由 SW NetworkFirst 交 cache
    const response = await fetchImpl(url, { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as unknown;
};

/** parse + 兩個 registry 都 build 到先算數（build 會驗晒 definition 同圖 manifest） */
const buildRemote = (value: unknown): Registries => {
    const doc = parseCatalogDocument(value);
    return {
        dramas: buildRegistry(documentSource(doc, 'dramas')),
        shows: buildShowRegistry(documentSource(doc, 'shows')),
    };
};

const loadRemote = async (options: InitCatalogOptions): Promise<Registries> => {
    const { url, fetchImpl = (...args) => fetch(...args) } = options;
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? CATALOG_FETCH_TIMEOUT_MS;
    const value = await withTimeout(fetchJson(url, fetchImpl, controller.signal), timeoutMs, () =>
        controller.abort(),
    );
    return buildRemote(value);
};

/** 一個 session 只揀一次：dev 即刻 throw 出嚟（啟動次序錯咗），production 照用而家嘅 source */
const rejectLateInit = (reason: string): CatalogOrigin => {
    const message = `${LOG_PREFIX} initCatalog must run once, before any registry is read (${reason})`;
    if (import.meta.env.DEV) throw new Error(message);
    console.warn(message);
    return currentOrigin();
};

/**
 * main.tsx 喺 render 之前 await（只係 VITE_CATALOG_URL 有設定先叫）。永遠唔 reject（dev 用錯除外）：
 * 'remote' = 今次用 catalog.json；'bundled' = fallback 內建資料
 */
export const initCatalog = async (options: InitCatalogOptions): Promise<CatalogOrigin> => {
    if (initStarted) return rejectLateInit('called twice');
    if (registryRead) return rejectLateInit('a registry was read before it');
    initStarted = true;
    try {
        const loaded = await loadRemote(options);
        if (registryRead) throw new Error('a registry was read while fetching');
        remote = loaded;
    } catch (error) {
        console.warn(`${LOG_PREFIX} using the bundled catalog: ${options.url}`, error);
    }
    return currentOrigin();
};
