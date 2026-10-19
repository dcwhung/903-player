import { ALLOWED_AUDIO_ORIGIN } from '../config/constants';
import { SHOWS, type ShowConfig } from '../config/shows';
import type { Recording } from '../types/recording';
import { daysBetween, hkTimeHHMM, hkToday, weekdayOf } from '../utils/date';
import {
    dateFromShowDateKey,
    readProbeState,
    showDateKey,
    writeProbeState,
    type ProbeState,
} from './probeStore';

/** 等 metadata 最多幾耐；超時當冇呢個檔 */
export const PROBE_TIMEOUT_MS = 15_000;
/** 今日 / 尋日搵唔到嘅檔隔幾耐先再試（錄音通常節目完咗一陣先上架） */
export const PROBE_RETRY_MS = 30 * 60 * 1_000;
/** 回看幾多日（包括今日）：幾日冇開 app 都攞得返嗰幾日嘅錄音 */
export const PROBE_LOOKBACK_DAYS = 14;
/** 播出日之後過咗幾多日先記低嘅 miss 就當「已定」（今日 = 0、尋日 = 1） */
const SETTLED_AFTER_DAYS = 2;
/**
 * 已定嘅 miss 隔幾耐再試：原站間中遲幾日先補上架，所以唔可以永久放棄；
 * 一日試一次已經夠，亦令斷網誤記嘅 miss 最多只影響一日
 */
export const PROBE_SETTLED_RETRY_MS = 24 * 60 * 60 * 1_000;
/** 搵到嘅錄音最多留幾多日（香港日期），feed 一直唔更新都唔會越積越多 */
export const PROBE_FOUND_RETENTION_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1_000;
/**
 * MediaError.MEDIA_ERR_NETWORK：斷網、captive portal、DNS 失敗都係呢個 code，
 * 唔代表冇呢個檔。直接寫數字，因為 jsdom 等環境冇 MediaError
 */
const MEDIA_ERR_NETWORK = 2;
const AUDIO_EXTENSION = '.aac';

/**
 * probe 結果：found / missing 係瀏覽器真係答咗；timeout 係乜都冇發生，
 * 可能係平台（例如 iOS）冇用戶操作就唔載 media，唔代表冇呢個檔
 */
export type ProbeResult = 'found' | 'missing' | 'timeout';

/** 檢查一個錄音網址存唔存在；可以注入，方便測試 */
export type AudioProber = (url: string) => Promise<ProbeResult>;

/** 裝置而家有冇網絡；可以注入，方便測試 */
export type OnlineChecker = () => boolean;

export interface ProbeOptions {
    probe?: AudioProber;
    now?: Date;
    isOnline?: OnlineChecker;
    /** 每搵到一個就即刻通知（唔使等成輪 probe 完），等 UI 可以逐個加 */
    onFound?: (recording: Recording) => void;
}

/** 冇 navigator（例如 SSR / 測試環境）就當有網，交俾 probe 自己判斷 */
const navigatorIsOnline: OnlineChecker = () => typeof navigator === 'undefined' || navigator.onLine;

/** 檔名入面嘅節目名用底線代替空格（Bad Girl大過佬 → Bad_Girl大過佬） */
const fileShowName = (name: string): string => name.replace(/ /g, '_');

/** https://audio.hkfm903.live/<節目名>/<YYYYMMDD>_<HHMM>_<節目名>.aac */
export const buildAudioUrl = (show: ShowConfig, date: string): string => {
    const fileName = `${date.replace(/-/g, '')}_${show.fileTime}_${fileShowName(show.name)}`;
    return `${ALLOWED_AUDIO_ORIGIN}/${encodeURIComponent(show.name)}/${encodeURIComponent(fileName)}${AUDIO_EXTENSION}`;
};

/**
 * 用 <audio> 只攞 metadata 嚟判斷檔案存唔存在：播放唔受 CORS 限制，
 * 同用戶平時撳播放一樣，唔使偽裝亦唔使 proxy
 */
export const probeAudio = (
    url: string,
    createAudio: () => HTMLAudioElement = () => new Audio(),
    timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<ProbeResult> =>
    new Promise((resolve) => {
        const audio = createAudio();
        const finish = (result: ProbeResult): void => {
            clearTimeout(timer);
            audio.removeEventListener('loadedmetadata', onFound);
            audio.removeEventListener('error', onMissing);
            // 移走 src 再 load()，先至真係停低下載；淨係設 src = '' 會當咗去載當前頁
            audio.removeAttribute('src');
            audio.load();
            resolve(result);
        };
        const onFound = (): void => finish('found');
        // 網絡問題當 timeout：停低今次，唔好記低一個其實存在嘅檔做 miss
        const onMissing = (): void =>
            finish(audio.error?.code === MEDIA_ERR_NETWORK ? 'timeout' : 'missing');
        const timer = setTimeout(() => finish('timeout'), timeoutMs);
        audio.addEventListener('loadedmetadata', onFound);
        audio.addEventListener('error', onMissing);
        audio.preload = 'metadata';
        audio.src = url;
    });

const recentDates = (now: Date): string[] =>
    Array.from({ length: PROBE_LOOKBACK_DAYS }, (_, days) =>
        hkToday(new Date(now.getTime() - days * MS_PER_DAY)),
    );

/** 只保留回看期內嘅 miss 記錄，唔好令 localStorage 越積越多 */
const recentMisses = (misses: ProbeState['misses'], dates: string[]): ProbeState['misses'] =>
    Object.fromEntries(
        Object.entries(misses).filter(([key]) => dates.includes(dateFromShowDateKey(key))),
    );

/** 同一個網址可能有唔同編碼寫法（中文字 / %XX），比較前統一 */
const normalizeUrl = (url: string): string => {
    try {
        return new URL(url).href;
    } catch {
        return url;
    }
};

/**
 * 清走 feed 已經有嘅（同節目同日，或者同一個網址）同太舊嘅錄音，
 * 免得同 feed 重複或者 localStorage 越積越多
 */
const pruneFound = (found: Recording[], known: Recording[], now: Date): Recording[] => {
    const knownUrls = new Set(known.map((r) => normalizeUrl(r.url)));
    const covered = new Set(known.map((r) => showDateKey(r.showId, r.date)));
    const oldest = hkToday(new Date(now.getTime() - PROBE_FOUND_RETENTION_DAYS * MS_PER_DAY));
    return found.filter(
        (r) =>
            r.date >= oldest &&
            !covered.has(showDateKey(r.showId, r.date)) &&
            !knownUrls.has(normalizeUrl(r.url)),
    );
};

/** 之前搵到、feed 仲未有嘅錄音；同步讀，feed 一到就可以即刻顯示，唔使等 probe */
export const readCachedRecordings = (known: Recording[], now: Date = new Date()): Recording[] =>
    pruneFound(readProbeState().found, known, now);

interface ProbeSlot {
    key: string;
    recording: Recording;
}

const toSlot = (show: ShowConfig, date: string): ProbeSlot => ({
    key: showDateKey(show.id, date),
    recording: { showId: show.id, date, time: show.fileTime, url: buildAudioUrl(show, date) },
});

/** 播出日過咗兩日先搵唔到，多數真係冇，一日先再試；今日 / 尋日可能只係未上架，密啲試 */
const retryIntervalMs = (missedAt: number, date: string): number =>
    daysBetween(date, hkToday(new Date(missedAt))) >= SETTLED_AFTER_DAYS
        ? PROBE_SETTLED_RETRY_MS
        : PROBE_RETRY_MS;

/** 未搵過就要搵；搵唔到嘅隔 retryIntervalMs 再試 */
const isRetryDue = (missedAt: number | undefined, date: string, now: Date): boolean =>
    missedAt === undefined || now.getTime() - missedAt >= retryIntervalMs(missedAt, date);

const airsOn = (show: ShowConfig, date: string): boolean => show.airDays.includes(weekdayOf(date));

/** 今日嘅節目要開咪時間過咗先可能有錄音；HHMM 字串直接比較就得 */
const hasStarted = (show: ShowConfig, date: string, now: Date): boolean =>
    date !== hkToday(now) || show.fileTime <= hkTimeHHMM(now);

/** 回看期內，當日有播、已經開咪、未有錄音、又唔係已經搵過嘅節目 */
const pendingSlots = (have: Recording[], misses: ProbeState['misses'], now: Date): ProbeSlot[] => {
    const covered = new Set(have.map((r) => showDateKey(r.showId, r.date)));
    return recentDates(now)
        .flatMap((date) =>
            SHOWS.filter((show) => airsOn(show, date) && hasStarted(show, date, now)).map((show) =>
                toSlot(show, date),
            ),
        )
        .filter(
            (slot) =>
                !covered.has(slot.key) && isRetryDue(misses[slot.key], slot.recording.date, now),
        );
};

/** 由 storage 讀返上次嘅 state，順手清走 feed 已有、太舊同回看期外嘅記錄 */
const loadState = (known: Recording[], now: Date): ProbeState => {
    const stored = readProbeState();
    return {
        found: pruneFound(stored.found, known, now),
        misses: recentMisses(stored.misses, recentDates(now)),
    };
};

/** 將一個 probe 結果記入 state（直接改 state，因為係呢一輪自己嘅副本） */
const recordResult = (state: ProbeState, slot: ProbeSlot, result: ProbeResult, now: Date): void => {
    if (result === 'found') {
        state.found.push(slot.recording);
        delete state.misses[slot.key];
    } else {
        state.misses[slot.key] = now.getTime();
    }
};

/**
 * 回看 PROBE_LOOKBACK_DAYS 日，feed 未有嘅節目喺播放日逐個 probe（唔並行，減輕原站負擔）。
 * 搵到嘅記低，之後唔再 probe；feed 有咗就唔再保留。搵唔到嘅規則見 isRetryDue。
 * 每個結果即刻寫入 storage，中途閂 app 都唔會白做。
 * 一遇到 timeout 就停：平台背景唔載 media，再試落去都係白等，亦唔當係 miss。
 * 離線就完全唔 probe，淨係交返之前搵到嘅，免得將斷網當成冇錄音
 */
export const probeRecentRecordings = async (
    known: Recording[],
    {
        probe = probeAudio,
        now = new Date(),
        isOnline = navigatorIsOnline,
        onFound,
    }: ProbeOptions = {},
): Promise<Recording[]> => {
    const state = loadState(known, now);
    if (!isOnline()) {
        return state.found;
    }
    // 先寫一次：就算冇嘢要 probe，都要清走過期 / feed 已有嘅記錄
    writeProbeState(state);
    for (const slot of pendingSlots([...known, ...state.found], state.misses, now)) {
        const result = await probe(slot.recording.url);
        if (result === 'timeout') {
            break;
        }
        recordResult(state, slot, result, now);
        writeProbeState(state);
        if (result === 'found') {
            onFound?.(slot.recording);
        }
    }
    return state.found;
};
