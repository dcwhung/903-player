/** jsdom 唔支援播放，用呢個假 audio element 模擬 HTMLAudioElement 嘅事件 */
export class FakeAudio extends EventTarget {
    preload = '';
    currentTime = 0;
    duration = Number.NaN;
    paused = true;
    rejectPlay = false;
    private source = '';

    get src(): string {
        return this.source;
    }

    /** 同真 HTMLMediaElement 一樣：換 src 會 reset 播放位置同長度 */
    set src(value: string) {
        this.source = value;
        this.currentTime = 0;
        this.duration = Number.NaN;
    }

    play = vi.fn(async () => {
        if (this.rejectPlay) {
            throw new DOMException('blocked', 'NotAllowedError');
        }
        this.paused = false;
        this.dispatchEvent(new Event('play'));
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
