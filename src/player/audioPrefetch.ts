/*
 * 預先下載下一集：iOS 鎖屏時播放器淨係載到檔頭（readyState 停喺 1），真正音頻資料要返前景先載。
 * 每集 m4a 約 1MB，播緊一集時用 fetch 成個載落記憶體，換集時播 blob URL，背景唔使再上網。
 * 要 R2 開咗 CORS；載唔到就交返原本 URL 照舊播。
 */

/** 下載一個音檔做 Blob（可以注入，方便測試） */
export type FetchAudio = (url: string, signal: AbortSignal) => Promise<Blob>;

/** 下載進度通知（用嚟寫診斷 log） */
export type PrefetchListener = (
    event: 'prefetch-start' | 'prefetch-done' | 'prefetch-fail',
    url: string,
    detail?: string,
) => void;

/**
 * 預載用自己嘅 cache key（URL 加 query，R2 會忽略）：
 * - R2 冇帶 Origin 嘅回應冇 Vary: Origin，Safari 會將播放器載過、冇 CORS header 嘅快取畀 fetch 用 → CORS 失敗
 * - 唔可以用 cache: 'no-store'：Safari 會加 Cache-Control / Pragma header 觸發 preflight，R2 只准 Range → 403
 */
const PREFETCH_QUERY = '?prefetch=1';

export const fetchAudioBlob: FetchAudio = async (url, signal) => {
    const response = await fetch(`${url}${PREFETCH_QUERY}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
};

interface Entry {
    url: string;
    controller: AbortController;
    objectUrl?: string;
}

/** 最多留一集預載（加一集播緊）：記憶體大約 2MB */
export class AudioPrefetcher {
    private entry: Entry | undefined;
    /** 已經交咗畀播放器、播緊嘅 blob URL；換集之後先 revoke */
    private inUse: string | undefined;

    constructor(
        private readonly fetchAudio: FetchAudio = fetchAudioBlob,
        private readonly onEvent: PrefetchListener = () => undefined,
    ) {}

    /** 開始下載（同一個 URL 唔會重複載）；換咗另一集就放棄舊嗰集 */
    prefetch(url: string): void {
        if (this.entry?.url === url) return;
        this.drop();
        const entry: Entry = { url, controller: new AbortController() };
        this.entry = entry;
        this.onEvent('prefetch-start', url);
        this.fetchAudio(url, entry.controller.signal).then(
            (blob) => {
                if (this.entry !== entry) return;
                entry.objectUrl = URL.createObjectURL(blob);
                this.onEvent('prefetch-done', url, `${blob.size}B`);
            },
            (error: unknown) => {
                if (this.entry !== entry) return;
                this.entry = undefined;
                const { name, message } = error as Error;
                this.onEvent('prefetch-fail', url, `${name}: ${message}`);
            },
        );
    }

    /**
     * 播放器準備播 url：有載好嘅就交 blob URL（之後由呢度負責 revoke），冇就 undefined。
     * 每次換集都要叫，等上一集用完嘅 blob 可以釋放
     */
    take(url: string): string | undefined {
        this.releaseInUse();
        const objectUrl = this.entry?.url === url ? this.entry.objectUrl : undefined;
        if (objectUrl) {
            this.entry = undefined;
            this.inUse = objectUrl;
        }
        return objectUrl;
    }

    private releaseInUse(): void {
        if (this.inUse) URL.revokeObjectURL(this.inUse);
        this.inUse = undefined;
    }

    private drop(): void {
        if (!this.entry) return;
        this.entry.controller.abort();
        if (this.entry.objectUrl) URL.revokeObjectURL(this.entry.objectUrl);
        this.entry = undefined;
    }
}
