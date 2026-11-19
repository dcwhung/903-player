import {
    MS_PER_SECOND,
    NIGHT_END_HOUR,
    NIGHT_START_HOUR,
    SLEEP_TIMER_MINUTES,
} from '../config/constants';

const SECONDS_PER_MINUTE = 60;

export type SleepTimerMinutes = (typeof SLEEP_TIMER_MINUTES)[number];
/** 15 / 30 / 60 分鐘，或者「播完呢集」 */
export type SleepTimerOption = SleepTimerMinutes | 'episode';

/**
 * 開緊嘅睡眠 timer（9d）。deadline 係絕對時間（Date.now() 基準）：iOS 背景 timer 會延遲，
 * 每次檢查都同而家時間比較，唔靠 setTimeout 準時
 */
export interface SleepTimerState {
    /** minutes = 普通倒數；episode = 留喺同一集時以呢集播完為準 */
    kind: 'minutes' | 'episode';
    /** 用戶揀嘅掣（「播完呢集」轉咗普通倒數都係 'episode'，畀 UI 實色嗰粒） */
    option: SleepTimerOption;
    startedAt: number;
    /** 時間到嘅時刻；「播完呢集」= 揀嗰刻呢集剩餘時間，轉集 / 轉直播就用佢繼續倒數 */
    deadline: number;
    /** kind = episode 先有：揀嗰陣播緊邊集 */
    episodeId?: string;
}

/** 播放器而家載咗邊集、播到邊（秒）；直播 duration = Infinity */
export interface EpisodePosition {
    id: string;
    currentTime: number;
    duration: number;
}

/** 裝置本地時間 21:00 ≤ t 或 t < 05:00：先出月亮掣 */
export const isNightWindow = (date: Date): boolean => {
    const hour = date.getHours();
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
};

export const isSleepTimerOption = (value: unknown): value is SleepTimerOption =>
    value === 'episode' || (SLEEP_TIMER_MINUTES as readonly unknown[]).includes(value);

/**
 * 呢集仲有幾耐播完（ms）。直播（Infinity）、metadata 未到、已經喺尾或者冇載嘢 = undefined，
 * 即係唔揀得「播完呢集」
 */
export const episodeRemainingMs = (position: EpisodePosition | null): number | undefined => {
    if (!position || !Number.isFinite(position.duration) || position.duration <= 0) {
        return undefined;
    }
    const remaining = (position.duration - position.currentTime) * MS_PER_SECOND;
    return remaining > 0 ? remaining : undefined;
};

/** 一揀即開始計；「播完呢集」喺直播 / 冇載嘢時返回 null（拒絕） */
export const createSleepTimer = (
    option: SleepTimerOption,
    now: number,
    position: EpisodePosition | null,
): SleepTimerState | null => {
    if (option !== 'episode') {
        const deadline = now + option * SECONDS_PER_MINUTE * MS_PER_SECOND;
        return { kind: 'minutes', option, startedAt: now, deadline };
    }
    const remaining = episodeRemainingMs(position);
    if (remaining === undefined || !position) {
        return null;
    }
    return {
        kind: 'episode',
        option,
        startedAt: now,
        deadline: now + remaining,
        episodeId: position.id,
    };
};

/** 「播完呢集」而家仲係播緊嗰集（冇載嘢唔算轉集：例如重新載入之後未揀嘢） */
const isOnTimerEpisode = (state: SleepTimerState, recordingId: string | undefined): boolean =>
    state.kind === 'episode' && recordingId === state.episodeId;

/**
 * 轉去另一集 / 直播：「播完呢集」變普通倒數，用原本截止時間繼續計。
 * 冇載嘢（recordingId undefined）唔當轉集；冇變就返回同一個 object
 */
export const followEpisode = (
    state: SleepTimerState,
    recordingId: string | undefined,
): SleepTimerState => {
    if (state.kind !== 'episode' || recordingId === undefined || recordingId === state.episodeId) {
        return state;
    }
    const { option, startedAt, deadline } = state;
    return { kind: 'minutes', option, startedAt, deadline };
};

/**
 * 剩餘時間（ms）。留喺同一集嘅「播完呢集」跟播放位置（暫停唔減、seek 會變），
 * 其他情況跟絕對截止時間
 */
export const remainingMs = (
    state: SleepTimerState,
    now: number,
    position?: EpisodePosition | null,
): number => {
    const episodeLeft = isOnTimerEpisode(state, position?.id)
        ? episodeRemainingMs(position ?? null)
        : undefined;
    return episodeLeft ?? Math.max(0, state.deadline - now);
};

/** 剩餘比例（1 = 啱啱開始，0 = 時間到）；seek 返轉頭最多都係 1 */
export const fraction = (
    state: SleepTimerState,
    now: number,
    position?: EpisodePosition | null,
): number => {
    const total = state.deadline - state.startedAt;
    if (total <= 0) {
        return 0;
    }
    return Math.min(1, remainingMs(state, now, position) / total);
};

/** 時間到未：留喺同一集嘅「播完呢集」唔睇時間，等呢集播完（AudioController stopAfterCurrent） */
export const isExpired = (
    state: SleepTimerState,
    now: number,
    recordingId: string | undefined,
): boolean => !isOnTimerEpisode(state, recordingId) && now >= state.deadline;
