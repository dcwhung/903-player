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
/** 播出日之後過咗幾多日先記低嘅 miss 就當真係冇，唔再試（今日 = 0、尋日 = 1） */
const SETTLED_AFTER_DAYS = 2;
/** 搵到嘅錄音最多留幾多日（香港日期），feed 一直唔更新都唔會越積越多 */
export const PROBE_FOUND_RETENTION_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1_000;
const AUDIO_EXTENSION = '.aac';

/**
 * probe 結果：found / missing 係瀏覽器真係答咗；timeout 係乜都冇發生，
 * 可能係平台（例如 iOS）冇用戶操作就唔載 media，唔代表冇呢個檔
 */
export type ProbeResult = 'found' | 'missing' | 'timeout';

/** 檢查一個錄音網址存唔存在；可以注入，方便測試 */
export type AudioProber = (url: string) => Promise<ProbeResult>;

export interface ProbeOptions {
    probe?: AudioProber;
    now?: Date;
}

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
        const onMissing = (): void => finish('missing');
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

/**
 * 未搵過就要搵；播出日過咗兩日先搵唔到，即係真係冇，唔再試；
 * 今日 / 尋日搵唔到可能只係未上架，隔 PROBE_RETRY_MS 再試
 */
const isRetryDue = (missedAt: number | undefined, date: string, now: Date): boolean => {
    if (missedAt === undefined) {
        return true;
    }
    if (daysBetween(date, hkToday(new Date(missedAt))) >= SETTLED_AFTER_DAYS) {
        return false;
    }
    return now.getTime() - missedAt >= PROBE_RETRY_MS;
};

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

/**
 * 回看 PROBE_LOOKBACK_DAYS 日，feed 未有嘅節目喺播放日逐個 probe（唔並行，減輕原站負擔）。
 * 搵到嘅記低，之後唔再 probe；feed 有咗就唔再保留。搵唔到嘅規則見 isRetryDue。
 * 一遇到 timeout 就停：平台背景唔載 media，再試落去都係白等，亦唔當係 miss
 */
export const probeRecentRecordings = async (
    known: Recording[],
    { probe = probeAudio, now = new Date() }: ProbeOptions = {},
): Promise<Recording[]> => {
    const stored = readProbeState();
    const found = pruneFound(stored.found, known, now);
    const misses = recentMisses(stored.misses, recentDates(now));
    for (const { key, recording } of pendingSlots([...known, ...found], misses, now)) {
        const result = await probe(recording.url);
        if (result === 'timeout') {
            break;
        }
        if (result === 'found') {
            found.push(recording);
            delete misses[key];
        } else {
            misses[key] = now.getTime();
        }
    }
    writeProbeState({ found, misses });
    return found;
};
