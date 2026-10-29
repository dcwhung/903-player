import { AUDIBLE_ADVANCE_SECONDS } from '../src/config/constants';

/** emitAudible 行幾多倍出聲門檻（避開浮點數誤差） */
const AUDIBLE_TEST_MARGIN = 2;

export interface FakeAudioOptions {
    /**
     * 跟足 spec：本身已經播緊時 play() 唔會再發 play event。
     * 預設 false 係為咗兼容舊測試（佢哋每次 play() 都等 play event）
     */
    strictPlayEvents?: boolean;
}

/** 假 TimeRanges：[[start, end], ...] */
export const timeRanges = (ranges: [number, number][]): TimeRanges => ({
    length: ranges.length,
    start: (index: number) => ranges[index]?.[0] ?? Number.NaN,
    end: (index: number) => ranges[index]?.[1] ?? Number.NaN,
});

/** jsdom 唔支援播放，用呢個假 audio element 模擬 HTMLAudioElement 嘅事件 */
export class FakeAudio extends EventTarget {
    preload = '';
    currentTime = 0;
    duration = Number.NaN;
    paused = true;
    readyState = 0;
    networkState = 0;
    /** 已載入嘅範圍（播放 log 用） */
    buffered: TimeRanges = timeRanges([]);
    /** 播到尾：同真 element 一樣，換 src / 再 play 就清走 */
    ended = false;
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
        this.ended = false;
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

    /** 同真 element 一樣：重新載入會清走 error，位置同長度 reset */
    load = vi.fn(() => {
        this.error = null;
        this.currentTime = 0;
        this.duration = Number.NaN;
    });

    play = vi.fn(async () => {
        if (this.rejectPlay) {
            throw new DOMException('blocked', 'NotAllowedError');
        }
        // 載入失敗咗（例如斷網）嘅 element 唔會自己重試，play() 直接 reject
        if (this.error) {
            throw new DOMException('failed', 'NotSupportedError');
        }
        if (this.options.strictPlayEvents && !this.paused) {
            return;
        }
        this.paused = false;
        this.ended = false;
        // 真瀏覽器係 queue 一個 task 先發 play event，即係喺 caller 執行完之後（同 timeupdate 一樣）
        queueMicrotask(() => this.dispatchEvent(new Event('play')));
    });

    pause = vi.fn(() => {
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
    });

    /** 有足夠數據、真正開始出聲（真瀏覽器喺 play event 之後，數據到先發） */
    emitPlaying(): void {
        this.dispatchEvent(new Event('playing'));
    }

    /**
     * 真正出聲：playing 之後位置真係行咗（S-551：iOS 會發 playing 但位置凍結冇聲）。
     * 要 metadata 已到，否則 controller 唔信個位置。行兩倍門檻：浮點數 100 + 0.3 - 100 < 0.3
     */
    emitAudible(): void {
        this.emitPlaying();
        this.emitTime(this.currentTime + AUDIBLE_ADVANCE_SECONDS * AUDIBLE_TEST_MARGIN);
    }

    /** 播緊但數據唔夠（緩衝 / seek 去未載到嘅位置） */
    emitWaiting(): void {
        this.dispatchEvent(new Event('waiting'));
    }

    /** 載入失敗（斷網 / 冇檔）：記低 error code 再發 error event */
    fail(code: number): void {
        this.error = { code };
        this.dispatchEvent(new Event('error'));
    }

    emitMetadata(duration: number): void {
        this.duration = duration;
        this.dispatchEvent(new Event('loadedmetadata'));
    }

    emitTime(seconds: number): void {
        this.currentTime = seconds;
        this.dispatchEvent(new Event('timeupdate'));
    }

    /** 同 spec 一樣：播到尾先發 pause（嗰陣 ended 已經係 true），再發 ended */
    end(): void {
        this.currentTime = this.duration;
        this.paused = true;
        this.ended = true;
        this.dispatchEvent(new Event('pause'));
        this.dispatchEvent(new Event('ended'));
    }

    asAudio(): HTMLAudioElement {
        return this as unknown as HTMLAudioElement;
    }
}
