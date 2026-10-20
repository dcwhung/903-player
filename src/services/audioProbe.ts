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
/**
 * 每個節目最多留幾多集（按日期 + 時間由新到舊），localStorage 唔會越積越多。
 * 一定要夠蓋住回看期內播得最密嘅節目：如果少過，仲喺回看期內嘅錄音會先被清走、
 * 再被當成未搵過重新 probe，白白多咗請求，列表亦會忽然少咗嗰幾集
 */
export const PROBE_KEEP_PER_SHOW = 50;
const MS_PER_DAY = 24 * 60 * 60 * 1_000;
/**
 * MediaError.MEDIA_ERR_NETWORK：只會喺已經收到部分 data 之後先斷線先出現；
 * 完全攞唔到（斷網 / DNS / captive portal）按 spec 係 code 4，同冇檔一樣，
 * 所以 probeRecentRecordings 收到 missing 之後會再 check 一次 isOnline，加埋 24h 重試兜底。
 * 直接寫數字，因為 jsdom 等環境冇 MediaError
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

/** 新嘅排先：日期再時間（YYYY-MM-DD + HHMM 字串直接比較就得） */
const newestFirst = (a: Recording, b: Recording): number =>
    `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`);

/** 每個節目只留最新 PROBE_KEEP_PER_SHOW 集；保留原本次序 */
const keepNewestPerShow = (found: Recording[]): Recording[] => {
    const counts = new Map<string, number>();
    const kept = new Set(
        [...found].sort(newestFirst).filter((r) => {
            const count = (counts.get(r.showId) ?? 0) + 1;
            counts.set(r.showId, count);
            return count <= PROBE_KEEP_PER_SHOW;
        }),
    );
    return found.filter((r) => kept.has(r));
};

/** 已經搵到嘅錄音（app 唯一嘅資料來源）；同步讀，一開 app 就可以即刻顯示，唔使等 probe */
export const readStoredRecordings = (): Recording[] => keepNewestPerShow(readProbeState().found);

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
const pendingSlots = ({ found, misses }: ProbeState, now: Date): ProbeSlot[] => {
    const covered = new Set(found.map((r) => showDateKey(r.showId, r.date)));
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

/** 由 storage 讀返上次嘅 state，順手清走每個節目超出上限嘅錄音同回看期外嘅 miss */
const loadState = (now: Date): ProbeState => {
    const stored = readProbeState();
    return {
        found: keepNewestPerShow(stored.found),
        misses: recentMisses(stored.misses, recentDates(now)),
    };
};

/** 將一個 probe 結果記入 state（直接改 state，因為係呢一輪自己嘅副本） */
const recordResult = (state: ProbeState, slot: ProbeSlot, result: ProbeResult, now: Date): void => {
    if (result === 'found') {
        state.found = keepNewestPerShow([...state.found, slot.recording]);
        delete state.misses[slot.key];
    } else {
        state.misses[slot.key] = now.getTime();
    }
};

/**
 * 回看 PROBE_LOOKBACK_DAYS 日，未有錄音嘅節目喺播放日逐個 probe（唔並行，減輕原站負擔）。
 * 搵到嘅記低，之後唔再 probe；每個節目只留最新 PROBE_KEEP_PER_SHOW 集。搵唔到嘅規則見 isRetryDue。
 * 每個結果即刻寫入 storage，中途閂 app 都唔會白做。
 * 一遇到 timeout 就停：平台背景唔載 media，再試落去都係白等，亦唔當係 miss。
 * 離線就完全唔 probe，淨係交返之前搵到嘅，免得將斷網當成冇錄音
 */
export const probeRecentRecordings = async ({
    probe = probeAudio,
    now = new Date(),
    isOnline = navigatorIsOnline,
    onFound,
}: ProbeOptions = {}): Promise<Recording[]> => {
    const state = loadState(now);
    if (!isOnline()) {
        return state.found;
    }
    // 先寫一次：就算冇嘢要 probe，都要清走超出上限 / 過期嘅記錄
    writeProbeState(state);
    for (const slot of pendingSlots(state, now)) {
        const result = await probe(slot.recording.url);
        // 中途斷網嘅 error 睇落同冇檔一樣：當 timeout 停低，唔好將剩低嘅 slot 全部記做 miss
        if (result === 'timeout' || (result === 'missing' && !isOnline())) {
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
