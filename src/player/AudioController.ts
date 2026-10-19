import { PROGRESS_SAVE_INTERVAL_MS, WATCHED_RATIO } from '../config/constants';
import { getResumePosition, isWatched, saveProgress } from '../services/progressStore';
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
        await this.play();
    };

    seek = (seconds: number): void => {
        const target = clamp(seconds, this.audio.duration);
        this.pendingStart = 0;
        this.audio.currentTime = target;
        this.update({ currentTime: target });
        this.persist();
    };

    skip = (deltaSeconds: number): void => this.seek(this.audio.currentTime + deltaSeconds);

    stop = (): void => {
        this.audio.pause();
        this.persist();
    };

    private switchTo(recording: Recording): void {
        this.persist();
        this.watched = isWatched(recording.url);
        this.pendingStart = getResumePosition(recording.url);
        this.audio.src = recording.url;
        this.update({ recording, currentTime: this.pendingStart, duration: 0 });
    }

    /** 已聽過而停喺尾段：再入嚟就由頭播 */
    private isParkedAtEnd(): boolean {
        return this.watched && this.audio.currentTime / this.audio.duration >= WATCHED_RATIO;
    }

    private persist = (): void => {
        this.lastSavedAt = Date.now();
        const { recording } = this.state;
        // 未 loadedmetadata 前 currentTime 已被 reset 做 0，存落去會洗走續播位置
        if (!recording || !Number.isFinite(this.audio.duration)) {
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
            this.pendingStart = 0;
        }
    };

    private onTimeUpdate = (): void => {
        this.update({ currentTime: this.audio.currentTime });
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
