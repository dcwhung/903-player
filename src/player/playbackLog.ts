/*
 * 播放診斷 log：iPhone 鎖屏換集「時間有行但冇聲」喺 jsdom / Chromium 重現唔到，
 * 所以將 audio 每個 event 連狀態記入 localStorage，版本號連撳 5 下複製出嚟分析。
 * 全部 try/catch：log 壞咗都唔可以影響播放。
 */
import { APP_VERSION } from '../config/appVersion';
import {
    PLAYBACK_LOG_MAX_ENTRIES,
    PLAYBACK_LOG_STORAGE_KEY,
    PLAYBACK_LOG_TICK_MS,
} from '../config/constants';

/** 換集、載入、緩衝、播放同停止相關嘅 media event（timeupdate 另外限流） */
const MEDIA_EVENTS = [
    'loadstart',
    'loadedmetadata',
    'loadeddata',
    'canplay',
    'canplaythrough',
    'play',
    'playing',
    'waiting',
    'stalled',
    'suspend',
    'pause',
    'ended',
    'error',
    'emptied',
    'abort',
] as const;
const PAGE_EVENTS = ['pagehide', 'pageshow'] as const;
const TIME_DECIMALS = 1;
const TIME_OF_DAY_START = 11;
const TIME_OF_DAY_END = 23;
const COPY_PROMPT = '複製以下播放 log';

const readLines = (): string[] => {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(PLAYBACK_LOG_STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.filter((l): l is string => typeof l === 'string')
            : [];
    } catch {
        return [];
    }
};

/** URL 最後一段（解碼），即係檔名 */
const audioFileName = (src: string): string => {
    try {
        return decodeURIComponent(src.split('/').at(-1) ?? '');
    } catch {
        return src;
    }
};

/** 包住而家位置嗰段已載入範圍嘅尾（1 位小數）；冇就 -（S-551：分得出卡住時有冇數據） */
const bufferedEnd = (audio: HTMLAudioElement): string => {
    // 舊瀏覽器 / 假 element 可能冇 buffered
    const ranges = audio.buffered as TimeRanges | undefined;
    const count = ranges?.length ?? 0;
    for (let index = 0; ranges && index < count; index += 1) {
        const end = ranges.end(index);
        if (ranges.start(index) <= audio.currentTime && audio.currentTime <= end) {
            return end.toFixed(TIME_DECIMALS);
        }
    }
    return '-';
};

/** 一行：時間 event ct dur buf rs ns paused vis [note] */
const formatLine = (event: string, audio: HTMLAudioElement, note?: string): string => {
    const time = new Date().toISOString().slice(TIME_OF_DAY_START, TIME_OF_DAY_END);
    const fields = [
        time,
        event,
        `ct=${audio.currentTime.toFixed(TIME_DECIMALS)}`,
        `dur=${audio.duration.toFixed(TIME_DECIMALS)}`,
        `buf=${bufferedEnd(audio)}`,
        `rs=${audio.readyState}`,
        `ns=${audio.networkState}`,
        `paused=${audio.paused ? 1 : 0}`,
        `vis=${document.visibilityState.charAt(0)}`,
    ];
    return [...fields, ...(note ? [note] : [])].join(' ');
};

export const readPlaybackLog = (): string[] => readLines();

/** 記一行（UTC 時間）；滿咗就清走最舊嘅 */
export const recordPlayback = (event: string, audio: HTMLAudioElement, note?: string): void => {
    try {
        const lines = [...readLines(), formatLine(event, audio, note)];
        localStorage.setItem(
            PLAYBACK_LOG_STORAGE_KEY,
            JSON.stringify(lines.slice(-PLAYBACK_LOG_MAX_ENTRIES)),
        );
    } catch {
        // 冇 storage / 爆 quota：唔記
    }
};

/** 聽住 audio 同頁面 event 自動記 log，返回解除 function；先記一行 boot + 版本號，分得出係邊個 build */
export const attachPlaybackLog = (audio: HTMLAudioElement): (() => void) => {
    recordPlayback('boot', audio, `v${APP_VERSION}`);
    let lastTickAt = Number.NEGATIVE_INFINITY;
    const onMedia = (event: Event) =>
        recordPlayback(
            event.type,
            audio,
            event.type === 'loadstart' ? audioFileName(audio.currentSrc || audio.src) : undefined,
        );
    const onTick = () => {
        if (Date.now() - lastTickAt < PLAYBACK_LOG_TICK_MS) return;
        lastTickAt = Date.now();
        recordPlayback('timeupdate', audio);
    };
    const onPage = (event: Event) => recordPlayback(event.type, audio);
    MEDIA_EVENTS.forEach((name) => audio.addEventListener(name, onMedia));
    audio.addEventListener('timeupdate', onTick);
    document.addEventListener('visibilitychange', onPage);
    PAGE_EVENTS.forEach((name) => window.addEventListener(name, onPage));
    return () => {
        MEDIA_EVENTS.forEach((name) => audio.removeEventListener(name, onMedia));
        audio.removeEventListener('timeupdate', onTick);
        document.removeEventListener('visibilitychange', onPage);
        PAGE_EVENTS.forEach((name) => window.removeEventListener(name, onPage));
    };
};

/**
 * 複製成份 log 去剪貼簿，返回行數。要喺撳嘅 handler 入面叫（iOS 要用戶操作先准寫剪貼簿）；
 * 寫唔到就開 prompt 俾用戶自己全選複製
 */
export const copyPlaybackLog = async (): Promise<number> => {
    const lines = readLines();
    const text = lines.join('\n');
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        window.prompt(COPY_PROMPT, text);
    }
    return lines.length;
};
