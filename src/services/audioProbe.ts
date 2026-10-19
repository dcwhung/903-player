import { ALLOWED_AUDIO_ORIGIN } from '../config/constants';
import { SHOWS, type ShowConfig } from '../config/shows';
import type { Recording } from '../types/recording';
import { hkToday } from '../utils/date';
import { readProbeState, writeProbeState, type ProbeState } from './probeStore';

/** 等 metadata 最多幾耐；超時當冇呢個檔 */
export const PROBE_TIMEOUT_MS = 15_000;
/** 搵唔到嘅檔隔幾耐先再試（錄音通常節目完咗一陣先上架） */
export const PROBE_RETRY_MS = 30 * 60 * 1_000;
/** probe 幾多日：今日同尋日 */
const PROBE_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1_000;
const AUDIO_EXTENSION = '.aac';

/** 檢查一個錄音網址存唔存在；可以注入，方便測試 */
export type AudioProber = (url: string) => Promise<boolean>;

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
): Promise<boolean> =>
    new Promise((resolve) => {
        const audio = createAudio();
        const finish = (exists: boolean): void => {
            clearTimeout(timer);
            audio.removeEventListener('loadedmetadata', onFound);
            audio.removeEventListener('error', onMissing);
            // 清走 src，唔好繼續下載成個檔
            audio.src = '';
            resolve(exists);
        };
        const onFound = (): void => finish(true);
        const onMissing = (): void => finish(false);
        const timer = setTimeout(onMissing, timeoutMs);
        audio.addEventListener('loadedmetadata', onFound);
        audio.addEventListener('error', onMissing);
        audio.preload = 'metadata';
        audio.src = url;
    });

const recentDates = (now: Date): string[] =>
    Array.from({ length: PROBE_DAYS }, (_, days) =>
        hkToday(new Date(now.getTime() - days * MS_PER_DAY)),
    );

const showDateKey = (showId: string, date: string): string => `${showId}:${date}`;

/** 只保留最近幾日嘅 miss 記錄，唔好令 localStorage 越積越多 */
const recentMisses = (misses: ProbeState['misses'], dates: string[]): ProbeState['misses'] =>
    Object.fromEntries(
        Object.entries(misses).filter(([key]) => dates.includes(key.split(':')[1] ?? '')),
    );

/**
 * 今日同尋日，feed 未有嘅節目逐個 probe（唔並行，減輕原站負擔）。
 * 搵到嘅記低，之後唔再 probe；feed 有咗就唔再保留。搵唔到嘅隔 PROBE_RETRY_MS 先再試
 */
export const probeRecentRecordings = async (
    known: Recording[],
    { probe = probeAudio, now = new Date() }: ProbeOptions = {},
): Promise<Recording[]> => {
    const dates = recentDates(now);
    const stored = readProbeState();
    const knownUrls = new Set(known.map((r) => r.url));
    const covered = new Set(known.map((r) => showDateKey(r.showId, r.date)));
    const found = stored.found.filter((r) => !knownUrls.has(r.url));
    found.forEach((r) => covered.add(showDateKey(r.showId, r.date)));
    const misses = recentMisses(stored.misses, dates);
    for (const date of dates) {
        for (const show of SHOWS) {
            const key = showDateKey(show.id, date);
            const missedAt = misses[key];
            if (
                covered.has(key) ||
                (missedAt !== undefined && now.getTime() - missedAt < PROBE_RETRY_MS)
            ) {
                continue;
            }
            const url = buildAudioUrl(show, date);
            if (await probe(url)) {
                found.push({ showId: show.id, date, time: show.fileTime, url });
                delete misses[key];
            } else {
                misses[key] = now.getTime();
            }
        }
    }
    writeProbeState({ found, misses });
    return found;
};
