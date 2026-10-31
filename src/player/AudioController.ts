import {
    AUDIBLE_ADVANCE_SECONDS,
    EARLY_ADVANCE_SECONDS,
    FROZEN_PLAYING_MS,
    PROGRESS_SAVE_INTERVAL_MS,
    STALL_MAX_RETRIES,
    WATCHED_RATIO,
} from '../config/constants';
import {
    getResumePosition,
    isWatched,
    resetWatched,
    saveProgress,
} from '../services/progressStore';
import type { Track } from '../types/track';
import { bufferedEnd } from '../utils/bufferedEnd';
import { recordPlayback } from './playbackLog';
import { HAVE_FUTURE_DATA } from './mediaReadyState';
import type { LoadOptions, PlayerState } from './playerContext';
import { ReplayTracker } from './replayTracker';
import { StallWatchdog } from './stallWatchdog';

const INITIAL_STATE: PlayerState = {
    recording: null,
    isPlaying: false,
    isAudible: false,
    isStalled: false,
    currentTime: 0,
    duration: 0,
    watchedRevision: 0,
};

const clamp = (value: number, max: number): number =>
    Math.min(Number.isFinite(max) ? max : value, Math.max(0, value));

/** 全 app 唯一嘅 audio element；只載 metadata，用戶撳播先開始下載 */
export const createAudioElement = (): HTMLAudioElement => {
    const audio = new Audio();
    audio.preload = 'metadata';
    return audio;
};

/**
 * 包住唯一一個 HTMLAudioElement：負責播放、續播、存進度。
 * React 透過 subscribe / getSnapshot（useSyncExternalStore）讀取狀態。
 */
export class AudioController {
    private state: PlayerState = INITIAL_STATE;
    private readonly listeners = new Set<() => void>();
    private pendingStart = 0;
    private lastSavedAt = 0;
    private watched = false;
    /** 聽過嘅錄音由頭重播：計夠時間就清走「已收聽」 */
    private readonly replay = new ReplayTracker();
    /** 開始播 / 緩衝完 / seek 嗰下嘅位置：位置由呢度行過 AUDIBLE_ADVANCE_SECONDS 先當真正出聲 */
    private audibleFrom = 0;
    /** 撳咗 Play 但 play event 未到（瀏覽器仲準備緊）；PWA 更新要當播緊，唔好搶走呢下撳 */
    private playIntent = false;
    /** 最新一次 audio.play() 仲未 settle */
    private playPending = false;
    /** 每次 play() +1：舊嘅 play()（例如被換集 abort）settle 時唔可以清走新一次嘅意圖 */
    private playGeneration = 0;
    /** 今次嘗試（watchdog 新一輪 / 重試 reload）已經發過 playing：之後 readyState 升唔算進展（S-583） */
    private playingFired = false;
    /** 今次嘗試幾時發 playing（Date.now()）：位置由嗰陣起凍結幾耐（v1.20.9） */
    private playingAt = 0;
    /**
     * 上一次嘗試喺暫停嗰陣係懷疑卡住 / playing 後凍結：下一次鎖屏 Play 要即刻 reload，
     * 因為 iOS 每次 ms:play 都由頭計，plain play() 只會再凍結（v1.20.9）
     */
    private frozenBeforeStop = false;
    /** 收過幾多次 progress event（只會加）：metadata 未到前睇下載有冇進展（CUI-0011） */
    private progressEvents = 0;
    /**
     * 撳咗播（任何來源）一陣都未出聲就重新載入再播（S-551）。
     * 鎖屏仲載緊時唔自動 reload：等亮屏或者鎖屏 Play（v1.20.8）；playing 後凍結照 reload（v1.20.9）
     */
    private readonly stall = new StallWatchdog({
        canRetry: () => this.hasPlayIntent(),
        retry: (retriesLeft) => this.retryStalled(retriesLeft),
        onStalled: () => this.markStalled(),
        probe: () => ({
            bufferedEnd: bufferedEnd(this.audio),
            readyState: this.audio.readyState,
            currentTime: this.audio.currentTime,
            playingFired: this.playingFired,
            progressEvents: this.progressEvents,
        }),
        isHidden: () => document.visibilityState === 'hidden',
        isFrozenPlaying: () => this.isFrozenPlaying(),
    });

    /** 播完一集之後接住播邊集；冇設定或者返回 undefined 就停 */
    private nextTrack: ((track: Track) => Track | undefined) | undefined;

    constructor(private readonly audio: HTMLAudioElement) {}

    /** 設定播完自動接住播邊集（PlayerProvider 傳入） */
    setNextTrack = (resolver: ((track: Track) => Track | undefined) | undefined): void => {
        this.nextTrack = resolver;
    };

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): PlayerState => this.state;

    /** 播緊，或者用戶啱啱撳咗 Play 等緊 play event */
    hasPlayIntent = (): boolean => this.state.isPlaying || this.playIntent;

    /** 綁定 audio 同頁面事件，返回解除綁定嘅 function */
    attach = (): (() => void) => {
        const audioEvents: Record<string, () => void> = {
            loadedmetadata: this.onLoadedMetadata,
            timeupdate: this.onTimeUpdate,
            play: this.onPlay,
            playing: this.onPlaying,
            progress: this.onProgress,
            waiting: this.onSilent,
            pause: this.onPause,
            ended: this.onEnded,
            error: this.onError,
            emptied: this.onEmptied,
        };
        const entries = Object.entries(audioEvents);
        entries.forEach(([name, handler]) => this.audio.addEventListener(name, handler));
        window.addEventListener('pagehide', this.persist);
        window.addEventListener('online', this.recoverSource);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        return () => {
            entries.forEach(([name, handler]) => this.audio.removeEventListener(name, handler));
            window.removeEventListener('pagehide', this.persist);
            window.removeEventListener('online', this.recoverSource);
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            this.stopWatchingStall();
        };
    };

    load = async (recording: Track, { autoplay = false }: LoadOptions = {}): Promise<void> => {
        // 換集時 subscriber 已經會收到通知，所以要喺換之前標記想播
        if (autoplay) {
            this.setPlayIntent(true);
        }
        if (this.state.recording?.url !== recording.url) {
            this.switchTo(recording);
        } else if (this.isParkedAtEnd()) {
            this.seek(0);
            this.replay.arm(this.watched);
        }
        if (autoplay) {
            await this.play();
        }
    };

    play = async (): Promise<void> => {
        const generation = ++this.playGeneration;
        const isLatest = () => generation === this.playGeneration;
        this.setPlayIntent(true);
        this.watchStall();
        this.playPending = true;
        this.recoverSource();
        try {
            await this.audio.play();
            recordPlayback('play()', this.audio, 'resolved');
            // 本身已經播緊時 spec 唔會再發 play event，要喺度清走，否則會卡住擋住更新
            if (isLatest() && !this.audio.paused) {
                this.setPlayIntent(false);
            }
        } catch (error) {
            recordPlayback('play()', this.audio, `rejected ${(error as Error).name}`);
            // 瀏覽器擋自動播放：維持暫停，等用戶撳 Play；被新一次 play() 取代就交畀佢。
            // 冇播緊就唔使再睇住卡住；清埋 isStalled，否則之後同一集正常開播鎖屏會顯示 Play（S-581）
            if (isLatest()) {
                this.playIntent = false;
                this.stopWatchingStall();
                this.update({ isPlaying: false });
            }
        } finally {
            if (isLatest()) {
                this.playPending = false;
            }
        }
    };

    /**
     * 鎖屏 / 耳機嘅 Play：卡住時（鎖屏顯示 Play）element 本身仲係播緊，淨係 audio.play() 乜都唔會發生，
     * 要即刻重新載入再播，當新一次撳播重新計重試次數（S-551）。
     * 上一次嘗試（暫停之前）係卡住 / playing 後凍結都一樣：iOS 每次撳都由頭計，plain play() 只會再凍結（v1.20.9）。
     * 正常載緊（首個 deadline 未到）、慢但下載仲有進展（S-614），或者暫停前播得好地地就照 play()，唔好打斷（W-499）
     */
    resume = async (): Promise<void> => {
        if (this.frozenBeforeStop || this.isStuck()) {
            this.stopWatchingStall();
            this.reload('remote');
        } else if (this.isSuspectedStall()) {
            // 慢但仲載緊：唔 reload，記低方便對實機 log（S-614、S-621）
            recordPlayback('keep', this.audio, 'loading');
        }
        await this.play();
    };

    /** 記低鎖屏 / 耳機操作（播放 log） */
    logRemote = (action: string, note?: string): void => recordPlayback(action, this.audio, note);

    pause = (): void => {
        this.setPlayIntent(false);
        // 本身已經暫停嘅 element 唔會發 pause event（spec）：直接當停咗，收 watchdog、
        // 照記低凍結狀態畀下一次鎖屏 Play（S-643，同 stop 嘅 S-640 一樣）
        const alreadyPaused = this.audio.paused;
        this.audio.pause();
        if (alreadyPaused) this.onStopped();
    };

    /** 載入失敗咗嘅 element paused 可能仲係 false，但其實冇播緊：當暫停處理 */
    toggle = async (): Promise<void> =>
        this.audio.paused || this.audio.error ? this.play() : this.pause();

    restart = async (): Promise<void> => {
        this.seek(0);
        this.replay.arm(this.watched);
        await this.play();
    };

    seek = (seconds: number): void => {
        const target = clamp(seconds, this.audio.duration);
        // metadata 未到時記低目標，等 loadedmetadata 先套用（否則會由 0 起計）
        this.pendingStart = this.hasMetadata() ? 0 : target;
        this.audio.currentTime = target;
        // seek 唔算收聽時間：由新位置重新起計
        this.moveTo(target);
        this.update({ currentTime: target });
        this.persist();
    };

    // 用 state 而唔係 audio.currentTime：metadata 未到時 state 已經係續播位置
    skip = (deltaSeconds: number): void => this.seek(this.state.currentTime + deltaSeconds);

    stop = (): void => {
        this.setPlayIntent(false);
        this.audio.pause();
        // 本身已經暫停嘅 element 唔會再發 pause event（spec）：唔好靠 onPause 收 watchdog，
        // 否則佢之後照重試 play()，閂咗嘅播放器又出返（S-640）
        this.stopWatchingStall();
        if (this.state.isPlaying || this.state.isAudible) {
            this.update({ isPlaying: false, isAudible: false });
        }
        this.persist();
    };

    private switchTo(recording: Track): void {
        // 用戶自己揀咗另一集：唔好再重試自動接住播嗰集
        this.stopWatchingStall();
        this.persist();
        this.watched = isWatched(recording.url);
        this.pendingStart = getResumePosition(recording.url);
        this.moveTo(this.pendingStart);
        // 聽過嘅集 getResumePosition 係 0，即係由頭重播
        this.replay.arm(this.watched);
        this.audio.src = recording.url;
        this.update({ recording, currentTime: this.pendingStart, duration: 0 });
    }

    /**
     * 載入失敗（例如斷網）之後 element 唔會自己重試，play() 只會一直 reject：
     * 重新 load 同一個 source，續播位置用 state（load 會將 audio.currentTime reset 做 0）
     */
    private recoverSource = (): void => {
        if (!this.audio.error || !this.state.recording) {
            return;
        }
        this.pendingStart = this.state.currentTime;
        this.moveTo(this.pendingStart);
        this.loadSource();
        this.update({ duration: 0 });
    };

    /** metadata 未到時 duration 係 NaN；串流可能係 Infinity，都當已載入 */
    private hasMetadata(): boolean {
        return !Number.isNaN(this.audio.duration);
    }

    /** 已聽過、已暫停而停喺尾段：再入嚟就由頭播 */
    private isParkedAtEnd(): boolean {
        return (
            this.audio.paused &&
            this.watched &&
            this.audio.currentTime / this.audio.duration >= WATCHED_RATIO
        );
    }

    /** 重播夠鐘：清走「已收聽」，之後當新一次收聽照常存進度，再到 95% 先再打剔 */
    private resetReplay(): void {
        const { recording } = this.state;
        if (!recording) {
            return;
        }
        resetWatched(recording.url, this.audio.currentTime, this.audio.duration);
        this.lastSavedAt = Date.now();
        this.watched = false;
        this.update({ watchedRevision: this.state.watchedRevision + 1 });
    }

    private persist = (): void => {
        this.lastSavedAt = Date.now();
        const { recording } = this.state;
        // 未 loadedmetadata 前 currentTime 已被 reset 做 0，存落去會洗走續播位置
        if (!recording || !this.hasMetadata()) {
            return;
        }
        const progress = saveProgress(recording.url, this.audio.currentTime, this.audio.duration);
        if (progress.watched && !this.watched) {
            this.watched = true;
            this.update({ watchedRevision: this.state.watchedRevision + 1 });
        }
    };

    private onLoadedMetadata = (): void => {
        this.update({ duration: this.audio.duration });
        if (this.pendingStart > 0) {
            this.audio.currentTime = this.pendingStart;
            // 按 spec 呢度本身已經係 pendingStart；但 iOS 有可能喺 metadata 到之前發 timeupdate（位置 0），
            // 唔重設嘅話跳返續播位置嗰下會當咗收聽時間，錯清「已收聽」（S-550）
            this.moveTo(this.pendingStart);
            this.pendingStart = 0;
        }
    };

    private onTimeUpdate = (): void => {
        // 換 src 時瀏覽器會發一次 currentTime = 0 嘅 timeupdate；metadata 未到嘅位置唔可信
        if (!this.hasMetadata()) {
            return;
        }
        this.update({ currentTime: this.audio.currentTime });
        this.checkAudible();
        if (this.replay.track(this.audio.currentTime, this.audio.paused)) {
            this.resetReplay();
        }
        const intervalElapsed = Date.now() - this.lastSavedAt >= PROGRESS_SAVE_INTERVAL_MS;
        const crossedWatched =
            !this.watched && this.audio.currentTime / this.audio.duration >= WATCHED_RATIO;
        if (intervalElapsed || crossedWatched) {
            this.persist();
        }
        if (this.isAboutToEnd()) {
            this.advance('early');
        }
    };

    /** 播緊、就快播完（未到 ended）：串流長度係 Infinity，永遠唔會成立 */
    private isAboutToEnd(): boolean {
        const remaining = this.audio.duration - this.audio.currentTime;
        return !this.audio.paused && remaining <= EARLY_ADVANCE_SECONDS;
    }

    /** 跳位置（seek / 換集 / 重新載入 / 續播）：跳過嘅唔算收聽，亦唔算出聲 */
    private moveTo(position: number): void {
        this.replay.moveTo(position);
        this.audibleFrom = position;
    }

    /** 系統自己開始播（唔經 play()）都要睇住 */
    private onPlay = (): void => {
        this.playIntent = false;
        this.audibleFrom = this.audio.currentTime;
        this.watchStall();
        this.update({ isPlaying: true });
    };

    /** 撳播 / 開始播而未出聲：睇住佢，一陣都唔出聲就重試；已經出緊聲就唔使 */
    private watchStall(): void {
        if (!this.state.isAudible) {
            // 新一輪：之前嗰次嘅 playing 唔關今次事
            if (!this.stall.pending) {
                this.playingFired = false;
                this.frozenBeforeStop = false;
            }
            this.stall.start(STALL_MAX_RETRIES);
        }
    }

    /**
     * 數據到咗：iOS 有時發咗 playing 但位置凍結冇聲（S-551），所以只記低起點，
     * 等 timeupdate 見到位置真係行先當出聲
     */
    private onPlaying = (): void => {
        this.audibleFrom = this.audio.currentTime;
        this.playingFired = true;
        this.playingAt = Date.now();
        // 等夠凍結門檻再睇一次：鎖屏報咗卡住之後冇輪詢（S-613、C-011）
        this.stall.checkFrozenIn(FROZEN_PLAYING_MS);
    };

    /** bytes 入緊（約每 350 ms）：只計數畀 watchdog 比較，唔記 log（太密） */
    private onProgress = (): void => {
        this.progressEvents += 1;
    };

    /** 播緊而位置由起點行咗夠遠：真正出緊聲，唔使再睇住卡住 */
    private checkAudible(): void {
        const advanced = this.audio.currentTime - this.audibleFrom;
        if (this.audio.paused || advanced < AUDIBLE_ADVANCE_SECONDS) {
            return;
        }
        this.stopWatchingStall();
        if (!this.state.isAudible) {
            this.update({ isAudible: true });
        }
    }

    /** watchdog 首個 deadline 過咗而未出聲：懷疑卡住，鎖屏改為顯示停咗（C-010） */
    private markStalled(): void {
        if (!this.state.isStalled) {
            this.update({ isStalled: true });
        }
    }

    /** 唔再睇住卡住（出聲 / 停 / 換集）：同時清走「卡住」 */
    private stopWatchingStall(): void {
        this.stall.cancel();
        this.frozenBeforeStop = false;
        if (this.state.isStalled) {
            this.update({ isStalled: false });
        }
    }

    /** 緩衝緊：仲係「播緊」（掣維持暫停），但冇聲；數據返嚟之後由而家位置重新確認 */
    private onSilent = (): void => {
        this.audibleFrom = this.audio.currentTime;
        // 凍結時間同出聲起點一齊由而家計，唔好用之前嘅 playing（S-617）
        this.playingAt = Date.now();
        this.stall.checkFrozenIn(FROZEN_PLAYING_MS);
        this.update({ isAudible: false });
    };

    /**
     * 來源出錯（例如斷網）：等緊嘅 play 冇可能成功，亦冇嘢播緊。
     * 停止睇住並清走 isStalled：之後再撳播（recoverSource）係新一次開播，有自己嘅 deadline（S-581）
     */
    private onError = (): void => {
        this.stopWatchingStall();
        this.playIntent = false;
        this.update({ isPlaying: false, isAudible: false });
    };

    /** 換 src 會 queue emptied，嗰陣用戶啱啱撳嘅 Play 仲等緊，唔好清走 */
    private onEmptied = (): void => {
        if (!this.playPending) {
            this.setPlayIntent(false);
        }
        this.onSilent();
    };

    /** 唔改 state object（React 唔使 re-render），但要通知 PWA 更新重新判斷 */
    private setPlayIntent(value: boolean): void {
        if (this.playIntent === value) {
            return;
        }
        this.playIntent = value;
        this.notify();
    }

    /** 播到尾嘅 pause 交畀 onEnded：有下一集就唔好中途報「停咗」 */
    private onPause = (): void => {
        if (!this.audio.ended) {
            this.onStopped();
        }
    };

    /** pause / ended（包括拔耳筒、來電等系統暫停）：用戶冇再想播 */
    private onStopped = (): void => {
        // 暫停前已經卡住：記低畀下一次鎖屏 Play 即刻 reload（v1.20.9）
        const frozen = this.isStuck();
        this.stopWatchingStall();
        this.frozenBeforeStop = frozen;
        this.playIntent = false;
        this.update({ isPlaying: false, isAudible: false });
        this.persist();
    };

    /** 播完：有下一集就接住播（通常 advance 已經喺 timeupdate 換咗，呢度係後備）；冇就停 */
    private onEnded = (): void => {
        if (!this.advance('ended')) {
            this.onStopped();
        }
    };

    /**
     * 存低進度（會變聽過）再即刻換下一集播，唔等 React render。喺 timeupdate 仲播緊時換，
     * iOS 唔會收起 audio session，鎖屏 / 背景都接得住；換集期間維持「播緊」。
     * 冇下一集就返回 false
     */
    private advance(reason: 'early' | 'ended'): boolean {
        const { recording } = this.state;
        const next = recording ? this.nextTrack?.(recording) : undefined;
        if (!next) {
            return false;
        }
        recordPlayback('advance', this.audio, reason);
        this.persist();
        this.update({ isAudible: false });
        // autoplay 嘅 play() 會開始睇住卡住
        void this.load(next, { autoplay: true });
        return true;
    }

    /** iOS 鎖屏時可能一直唔載 / 位置凍結冇聲：重新 load 同一集，由最後真正播到嘅位置再播 */
    private retryStalled(retriesLeft: number): void {
        this.reload(`left=${retriesLeft}`);
        void this.play();
    }

    /** 重新載入同一集，續播位置用 state（最後真正播到嘅位置；load 會將 audio.currentTime reset 做 0） */
    private reload(note: string): void {
        recordPlayback('retry', this.audio, note);
        this.pendingStart = this.state.currentTime;
        this.moveTo(this.pendingStart);
        this.loadSource();
    }

    /**
     * 所有重新載入都經呢度：每次 audio.load() 都係新一次嘗試，數據由零再嚟，
     * 舊 playing 唔可以帶入新載入，未發 playing 前 rs 升照算進展（S-584）
     */
    private loadSource(): void {
        this.playingFired = false;
        this.audio.load();
    }

    /** 懷疑卡住：已經標咗卡住，或者 deadline 過咗但 timer 被 iOS 凍結未行 */
    private isSuspectedStall(): boolean {
        return this.state.isStalled || this.stall.overdue;
    }

    /**
     * 要 reload 先救得返：位置凍結，或者懷疑卡住而下載冇進展。
     * 慢但仲載緊（S-614）就唔算：reload 會 abort 佢，iOS 背景之後可能再唔載完（v1.20.7）
     */
    private isStuck(): boolean {
        return this.isFrozenPlaying() || (this.isSuspectedStall() && !this.stall.loading);
    }

    /**
     * 睇緊卡住而今次嘗試已發 playing、數據夠播（rs ≥ 3），但位置由 playing 起冇行過、已經 FROZEN_PLAYING_MS：
     * S-551 情境 2 pipeline 死咗。唔係載緊，數據喺本機，reload 唔會 abort 下載（v1.20.9）
     */
    private isFrozenPlaying(): boolean {
        const advanced = this.audio.currentTime - this.audibleFrom;
        return (
            this.stall.pending &&
            this.playingFired &&
            this.audio.readyState >= HAVE_FUTURE_DATA &&
            advanced < AUDIBLE_ADVANCE_SECONDS &&
            Date.now() - this.playingAt >= FROZEN_PLAYING_MS
        );
    }

    private onVisibilityChange = (): void => {
        if (document.visibilityState === 'hidden') {
            this.persist();
        } else if (this.stall.pending) {
            // 亮返屏幕：背景 timer 可能被凍結冇行過，過咗 deadline 先補做；未到期就繼續等（C-009）
            this.stall.retryIfOverdue();
        }
    };

    private update(partial: Partial<PlayerState>): void {
        this.state = { ...this.state, ...partial };
        this.notify();
    }

    private notify(): void {
        this.listeners.forEach((listener) => listener());
    }
}
