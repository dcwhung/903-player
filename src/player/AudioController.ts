import {
    PROGRESS_SAVE_INTERVAL_MS,
    REPLAY_RESET_SECONDS,
    WATCHED_RATIO,
} from '../config/constants';
import {
    getResumePosition,
    isWatched,
    resetWatched,
    saveProgress,
} from '../services/progressStore';
import type { Recording } from '../types/recording';
import type { LoadOptions, PlayerState } from './playerContext';

const INITIAL_STATE: PlayerState = {
    recording: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    watchedRevision: 0,
};

const clamp = (value: number, max: number): number =>
    Math.min(Number.isFinite(max) ? max : value, Math.max(0, value));

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
    /** 聽過嘅錄音由頭重播時累計嘅真正播放秒數；undefined = 唔係重播，唔使計 */
    private replayedSeconds: number | undefined;
    /** 上一次 timeupdate 嘅位置，用嚟計兩次之間播咗幾耐 */
    private lastTickPosition = 0;

    constructor(private readonly audio: HTMLAudioElement) {}

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): PlayerState => this.state;

    /** 綁定 audio 同頁面事件，返回解除綁定嘅 function */
    attach = (): (() => void) => {
        const audioEvents: Record<string, () => void> = {
            loadedmetadata: this.onLoadedMetadata,
            timeupdate: this.onTimeUpdate,
            play: () => this.update({ isPlaying: true }),
            pause: this.onStopped,
            ended: this.onStopped,
        };
        const entries = Object.entries(audioEvents);
        entries.forEach(([name, handler]) => this.audio.addEventListener(name, handler));
        window.addEventListener('pagehide', this.persist);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        return () => {
            entries.forEach(([name, handler]) => this.audio.removeEventListener(name, handler));
            window.removeEventListener('pagehide', this.persist);
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
        };
    };

    load = async (recording: Recording, { autoplay = false }: LoadOptions = {}): Promise<void> => {
        if (this.state.recording?.url !== recording.url) {
            this.switchTo(recording);
        } else if (this.isParkedAtEnd()) {
            this.seek(0);
            this.armReplay();
        }
        if (autoplay) {
            await this.play();
        }
    };

    play = async (): Promise<void> => {
        try {
            await this.audio.play();
        } catch {
            // 瀏覽器擋自動播放：維持暫停，等用戶撳 Play
            this.update({ isPlaying: false });
        }
    };

    pause = (): void => this.audio.pause();

    toggle = async (): Promise<void> => (this.audio.paused ? this.play() : this.pause());

    restart = async (): Promise<void> => {
        this.seek(0);
        this.armReplay();
        await this.play();
    };

    seek = (seconds: number): void => {
        const target = clamp(seconds, this.audio.duration);
        // metadata 未到時記低目標，等 loadedmetadata 先套用（否則會由 0 起計）
        this.pendingStart = this.hasMetadata() ? 0 : target;
        this.audio.currentTime = target;
        // seek 唔算收聽時間：由新位置重新起計
        this.lastTickPosition = target;
        this.update({ currentTime: target });
        this.persist();
    };

    // 用 state 而唔係 audio.currentTime：metadata 未到時 state 已經係續播位置
    skip = (deltaSeconds: number): void => this.seek(this.state.currentTime + deltaSeconds);

    stop = (): void => {
        this.audio.pause();
        this.persist();
    };

    private switchTo(recording: Recording): void {
        this.persist();
        this.watched = isWatched(recording.url);
        this.pendingStart = getResumePosition(recording.url);
        this.lastTickPosition = this.pendingStart;
        // 聽過嘅集 getResumePosition 係 0，即係由頭重播
        this.armReplay();
        this.audio.src = recording.url;
        this.update({ recording, currentTime: this.pendingStart, duration: 0 });
    }

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

    /** 聽過嘅錄音由頭播：開始計重播時間；未聽過就唔使計 */
    private armReplay(): void {
        this.replayedSeconds = this.watched ? 0 : undefined;
    }

    /** 累計真正播放時間（暫停、seek 唔計），夠 REPLAY_RESET_SECONDS 就重新開始記錄 */
    private trackReplay(): void {
        const position = this.audio.currentTime;
        const delta = position - this.lastTickPosition;
        this.lastTickPosition = position;
        if (this.replayedSeconds === undefined || this.audio.paused || delta <= 0) {
            return;
        }
        this.replayedSeconds += delta;
        if (this.replayedSeconds >= REPLAY_RESET_SECONDS) {
            this.resetReplay();
        }
    }

    /** 清走「已收聽」，之後當新一次收聽照常存進度，再到 95% 先再打剔 */
    private resetReplay(): void {
        this.replayedSeconds = undefined;
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
            this.lastTickPosition = this.pendingStart;
            this.pendingStart = 0;
        }
    };

    private onTimeUpdate = (): void => {
        // 換 src 時瀏覽器會發一次 currentTime = 0 嘅 timeupdate；metadata 未到嘅位置唔可信
        if (!this.hasMetadata()) {
            return;
        }
        this.update({ currentTime: this.audio.currentTime });
        this.trackReplay();
        const intervalElapsed = Date.now() - this.lastSavedAt >= PROGRESS_SAVE_INTERVAL_MS;
        const crossedWatched =
            !this.watched && this.audio.currentTime / this.audio.duration >= WATCHED_RATIO;
        if (intervalElapsed || crossedWatched) {
            this.persist();
        }
    };

    private onStopped = (): void => {
        this.update({ isPlaying: false });
        this.persist();
    };

    private onVisibilityChange = (): void => {
        if (document.visibilityState === 'hidden') {
            this.persist();
        }
    };

    private update(partial: Partial<PlayerState>): void {
        this.state = { ...this.state, ...partial };
        this.listeners.forEach((listener) => listener());
    }
}
