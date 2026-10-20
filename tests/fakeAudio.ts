export interface FakeAudioOptions {
    /**
     * 跟足 spec：本身已經播緊時 play() 唔會再發 play event。
     * 預設 false 係為咗兼容舊測試（佢哋每次 play() 都等 play event）
     */
    strictPlayEvents?: boolean;
}

/** jsdom 唔支援播放，用呢個假 audio element 模擬 HTMLAudioElement 嘅事件 */
export class FakeAudio extends EventTarget {
    preload = '';
    currentTime = 0;
    duration = Number.NaN;
    paused = true;
    rejectPlay = false;
    /** 同真 element 一樣：發 error event 之前設定，等 caller 睇 code 分辨網絡問題定冇檔 */
    error: { code: number } | null = null;
    private source = '';

    constructor(private readonly options: FakeAudioOptions = {}) {
        super();
    }

    get src(): string {
        return this.source;
    }

    /**
     * 同真 HTMLMediaElement 嘅 load algorithm 一樣：換 src 會 reset 播放位置同長度，
     * 而原本位置唔係 0 時會發一次 timeupdate
     */
    set src(value: string) {
        const wasPlayingFrom = this.currentTime;
        this.source = value;
        this.currentTime = 0;
        this.duration = Number.NaN;
        if (wasPlayingFrom !== 0) {
            // 真瀏覽器係 queue 一個 task 先發，即係喺 caller 執行完之後
            queueMicrotask(() => this.dispatchEvent(new Event('timeupdate')));
        }
    }

    /** 真 element 移除 src attribute 之後，src getter 會變返空字串 */
    removeAttribute(name: string): void {
        if (name === 'src') {
            this.src = '';
        }
    }

    load = vi.fn();

    play = vi.fn(async () => {
        if (this.rejectPlay) {
            throw new DOMException('blocked', 'NotAllowedError');
        }
        if (this.options.strictPlayEvents && !this.paused) {
            return;
        }
        this.paused = false;
        // 真瀏覽器係 queue 一個 task 先發 play event，即係喺 caller 執行完之後（同 timeupdate 一樣）
        queueMicrotask(() => this.dispatchEvent(new Event('play')));
    });

    pause = vi.fn(() => {
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
    });

    emitMetadata(duration: number): void {
        this.duration = duration;
        this.dispatchEvent(new Event('loadedmetadata'));
    }

    emitTime(seconds: number): void {
        this.currentTime = seconds;
        this.dispatchEvent(new Event('timeupdate'));
    }

    end(): void {
        this.currentTime = this.duration;
        this.paused = true;
        this.dispatchEvent(new Event('ended'));
    }

    asAudio(): HTMLAudioElement {
        return this as unknown as HTMLAudioElement;
    }
}
