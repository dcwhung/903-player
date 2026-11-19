import { SLEEP_TIMER_CHECK_MS } from '../config/constants';
import type { AudioController } from './AudioController';
import {
    createSleepTimer,
    episodeRemainingMs,
    followEpisode,
    fraction,
    isExpired,
    remainingMs,
    type EpisodePosition,
    type SleepTimerOption,
    type SleepTimerState,
} from './sleepTimer';
import { loadSleepTimer, saveSleepTimer } from './sleepTimerStorage';

/** 睡眠 timer 用到嘅 player 功能（AudioController 嘅一部分） */
export type SleepTimerPlayer = Pick<
    AudioController,
    'subscribe' | 'getSnapshot' | 'hasPlayIntent' | 'pause' | 'setStopAfterCurrent'
>;

export interface SleepTimerSnapshot {
    /** null = 冇開 timer（「上次時長」已由每晚排程取代，S-1201） */
    timer: SleepTimerState | null;
}

/**
 * 睡眠 timer（9d）：一揀即開始計，暫停 / 轉集都照計；時間到播緊就暫停（唔淡出），
 * 已暫停就淨係清 timer，唔自動重開。
 *
 * 截止時間係絕對時間：player 每次通知（包括 timeupdate）+ 每秒 interval 都同 Date.now() 比較，
 * iOS 背景 interval 延遲都唔會遲停。只喺 timer 本身變（開 / 改 / 取消 / 轉做普通倒數 / 時間到）先通知，
 * 每秒更新顯示由 useSleepTimer 自己 tick
 */
export class SleepTimerController {
    private snapshot: SleepTimerSnapshot;
    private readonly listeners = new Set<() => void>();
    private interval: ReturnType<typeof setInterval> | undefined;
    private attached = false;

    constructor(private readonly player: SleepTimerPlayer) {
        // 已過期嘅分鐘倒數喺 storage 清走（唔自動播）；「播完呢集」由 attach 嘅 check 睇載咗邊集再判斷
        this.snapshot = { timer: loadSleepTimer(Date.now()) };
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): SleepTimerSnapshot => this.snapshot;

    /** 開始跟住 player 同每秒檢查；返回解除 */
    attach = (): (() => void) => {
        const unsubscribe = this.player.subscribe(this.check);
        this.attached = true;
        // 重新載入還原咗嘅 timer：即刻開始每秒檢查
        this.syncInterval();
        this.check();
        return () => {
            unsubscribe();
            this.attached = false;
            this.stopInterval();
            this.player.setStopAfterCurrent(undefined);
        };
    };

    /**
     * 一揀即開始計（開緊就換過）。「播完呢集」喺直播 / 冇載嘢時拒絕，返回 false
     */
    start = (option: SleepTimerOption): boolean => {
        const timer = createSleepTimer(option, Date.now(), this.position());
        if (!timer) {
            return false;
        }
        this.setTimer(timer);
        return true;
    };

    cancel = (): void => this.setTimer(null);

    /** 剩餘時間（ms）；冇 timer = 0。同一集嘅「播完呢集」跟播放位置 */
    remainingMs = (now: number): number => {
        const { timer } = this.snapshot;
        return timer ? remainingMs(timer, now, this.position()) : 0;
    };

    /** 剩餘比例（1 → 0），畀進度條 / 9c；冇 timer = 0 */
    fraction = (now: number): number => {
        const { timer } = this.snapshot;
        return timer ? fraction(timer, now, this.position()) : 0;
    };

    /** 呢集仲有幾耐播完（選單「剩餘時間」）；undefined = 直播 / 未載到，「播完呢集」要變灰 */
    episodeRemainingMs = (): number | undefined => episodeRemainingMs(this.position());

    private position(): EpisodePosition | null {
        const { recording, currentTime, duration } = this.player.getSnapshot();
        return recording ? { id: recording.id, currentTime, duration } : null;
    }

    /** player 每次通知（timeupdate、轉集、暫停）同每秒 interval 都行 */
    private check = (): void => {
        const { timer } = this.snapshot;
        if (!timer) {
            return;
        }
        const now = Date.now();
        const recordingId = this.player.getSnapshot().recording?.id;
        const followed = followEpisode(timer, recordingId);
        if (followed !== timer) {
            // 轉集時截止時間已過（同一集暫停咗好耐）：用戶啱啱揀咗播，淨係清 timer，唔好即刻停
            this.setTimer(now >= followed.deadline ? null : followed);
            return;
        }
        if (isExpired(timer, now, recordingId)) {
            this.expire();
            return;
        }
        this.syncStopAfterCurrent();
    };

    /** 時間到：先清 timer（pause 會再觸發 check），播緊先暫停 */
    private expire(): void {
        this.setTimer(null);
        if (this.player.hasPlayIntent()) {
            this.player.pause();
        }
    }

    /** 「播完呢集」播完：AudioController 已經停低 */
    private onEpisodeEnded = (): void => this.setTimer(null);

    private setTimer(timer: SleepTimerState | null): void {
        this.snapshot = { timer };
        saveSleepTimer(timer);
        this.syncStopAfterCurrent();
        this.syncInterval();
        this.listeners.forEach((listener) => listener());
    }

    /** 留喺「播完呢集」嗰集先擋自動接下一集；其他情況恢復 */
    private syncStopAfterCurrent(): void {
        const { timer } = this.snapshot;
        const onSameEpisode =
            this.attached &&
            timer?.kind === 'episode' &&
            this.player.getSnapshot().recording?.id === timer.episodeId;
        this.player.setStopAfterCurrent(onSameEpisode ? this.onEpisodeEnded : undefined);
    }

    private syncInterval(): void {
        if (this.attached && this.snapshot.timer) {
            this.interval ??= setInterval(this.check, SLEEP_TIMER_CHECK_MS);
        } else {
            this.stopInterval();
        }
    }

    private stopInterval(): void {
        clearInterval(this.interval);
        this.interval = undefined;
    }
}
