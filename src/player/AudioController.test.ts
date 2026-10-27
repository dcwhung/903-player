import { FakeAudio } from '../../tests/fakeAudio';
import type { Recording } from '../types/recording';
import { EARLY_ADVANCE_SECONDS, STALL_MAX_RETRIES, STALL_RETRY_MS } from '../config/constants';
import { AudioController } from './AudioController';

const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/gongzi/20261017.aac',
};

/** play() 未 resolve、未發 play event：模擬撳 Play 之後瀏覽器仲準備緊 */
const setupPendingPlay = () => {
    const audio = new FakeAudio();
    let resolvePlay: () => void = () => undefined;
    audio.play.mockImplementation(
        () =>
            new Promise<void>((resolve) => {
                resolvePlay = () => {
                    audio.paused = false;
                    audio.dispatchEvent(new Event('play'));
                    resolve();
                };
            }),
    );
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    return { audio, controller, detach, resolvePlay: () => resolvePlay() };
};

describe('AudioController.hasPlayIntent', () => {
    it('should report play intent when play is called before the play event', async () => {
        const { controller, resolvePlay, detach } = setupPendingPlay();
        const playing = controller.play();
        expect(controller.getSnapshot().isPlaying).toBe(false);
        expect(controller.hasPlayIntent()).toBe(true);

        resolvePlay();
        await playing;
        expect(controller.hasPlayIntent()).toBe(true);
        expect(controller.getSnapshot().isPlaying).toBe(true);
        detach();
    });

    it('should report play intent when autoplay load notifies subscribers', () => {
        const { controller, detach } = setupPendingPlay();
        const seen: boolean[] = [];
        controller.subscribe(() => seen.push(controller.hasPlayIntent()));
        void controller.load(RECORDING, { autoplay: true });
        expect(seen.length).toBeGreaterThan(0);
        expect(seen.every(Boolean)).toBe(true);
        detach();
    });

    it('should clear play intent when the browser blocks playback', async () => {
        const audio = new FakeAudio();
        audio.rejectPlay = true;
        const controller = new AudioController(audio.asAudio());
        const detach = controller.attach();
        await controller.play();
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });

    it('should clear play intent when paused before the play event', () => {
        const { controller, detach } = setupPendingPlay();
        void controller.play();
        controller.pause();
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });

    it('should notify subscribers when play intent starts', () => {
        const { controller, detach } = setupPendingPlay();
        const listener = vi.fn();
        controller.subscribe(listener);
        void controller.play();
        expect(listener).toHaveBeenCalled();
        detach();
    });

    it('should report no play intent when idle', () => {
        const { controller, detach } = setupPendingPlay();
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });
});

/** 跟 spec 嘅假 audio：已經播緊時 play() 唔發 play event */
const setupPlaying = async () => {
    const audio = new FakeAudio({ strictPlayEvents: true });
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    await controller.load(RECORDING, { autoplay: true });
    audio.emitMetadata(1000);
    return { audio, controller, detach };
};

describe('AudioController play intent when already playing', () => {
    it('should clear play intent when a native pause follows play() while already playing', async () => {
        const { audio, controller, detach } = await setupPlaying();
        // useStartPlayback / useTodayPage 會對同一集再叫 load(autoplay)
        await controller.load(RECORDING, { autoplay: true });
        audio.pause(); // 例如拔耳筒、來電中斷
        expect(controller.getSnapshot().isPlaying).toBe(false);
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });

    it('should clear play intent when playback ends after play() while already playing', async () => {
        const { audio, controller, detach } = await setupPlaying();
        await controller.play();
        audio.end();
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });

    it('should clear play intent when a native pause arrives before the play event', async () => {
        const { audio, controller, resolvePlay, detach } = setupPendingPlay();
        void controller.play();
        audio.paused = true;
        audio.dispatchEvent(new Event('pause'));
        expect(controller.hasPlayIntent()).toBe(false);
        resolvePlay();
        detach();
    });

    it('should clear play intent when the source errors during a pending play', () => {
        // 來源出錯，等緊嘅 play 已經冇可能成功
        const { audio, controller, detach } = setupPendingPlay();
        void controller.play();
        audio.dispatchEvent(new Event('error'));
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });

    it('should leave play intent to the pause event after emptied with no play pending', async () => {
        const { audio, controller, detach } = await setupPlaying();
        await controller.load(RECORDING, { autoplay: true });
        audio.paused = true;
        audio.dispatchEvent(new Event('emptied'));
        expect(controller.hasPlayIntent()).toBe(true); // isPlaying 仲係 true，由 pause 負責
        audio.dispatchEvent(new Event('pause'));
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });

    it('should keep play intent when emptied fires during a pending play', () => {
        // 換集時 src 改咗會 queue emptied，但用戶啱啱撳嘅 Play 仲等緊
        const { audio, controller, detach } = setupPendingPlay();
        void controller.play();
        audio.dispatchEvent(new Event('emptied'));
        expect(controller.hasPlayIntent()).toBe(true);
        detach();
    });
});

/** 每次 play() 都返回一個可以由測試控制 settle 嘅 promise */
const setupManualPlays = () => {
    const audio = new FakeAudio();
    const rejects: ((error: Error) => void)[] = [];
    audio.play.mockImplementation(
        () => new Promise<void>((_resolve, reject) => rejects.push(reject)),
    );
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    const abort = (index: number) => rejects[index]?.(new DOMException('aborted', 'AbortError'));
    return { audio, controller, detach, abort };
};

describe('AudioController overlapping play() calls', () => {
    it('should keep play intent when an earlier aborted play() settles after a later one', async () => {
        const { controller, detach, abort } = setupManualPlays();
        const first = controller.play();
        void controller.play();
        abort(0);
        await first;
        expect(controller.hasPlayIntent()).toBe(true);
        detach();
    });

    it('should keep play intent on emptied when an earlier play() settled but a later one is pending', async () => {
        const { audio, controller, detach, abort } = setupManualPlays();
        const first = controller.play();
        void controller.play();
        abort(0);
        await first;
        audio.dispatchEvent(new Event('emptied'));
        expect(controller.hasPlayIntent()).toBe(true);
        detach();
    });

    it('should clear play intent when the latest play() is aborted', async () => {
        const { controller, detach, abort } = setupManualPlays();
        const first = controller.play();
        const second = controller.play();
        abort(0);
        abort(1);
        await Promise.all([first, second]);
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });
});

describe('AudioController.isAudible', () => {
    it('should stay silent until the audio actually starts playing', async () => {
        const { audio, controller, detach } = await setupPlaying();
        expect(controller.getSnapshot().isPlaying).toBe(true);
        expect(controller.getSnapshot().isAudible).toBe(false);

        audio.emitPlaying();
        expect(controller.getSnapshot().isAudible).toBe(true);
        detach();
    });

    it('should go silent while buffering and resume when data arrives', async () => {
        const { audio, controller, detach } = await setupPlaying();
        audio.emitPlaying();

        audio.emitWaiting();
        expect(controller.getSnapshot().isAudible).toBe(false);

        audio.emitPlaying();
        expect(controller.getSnapshot().isAudible).toBe(true);
        detach();
    });

    it('should go silent when paused or ended', async () => {
        const { audio, controller, detach } = await setupPlaying();
        audio.emitPlaying();
        audio.pause();
        expect(controller.getSnapshot().isAudible).toBe(false);

        await controller.play();
        audio.emitPlaying();
        audio.end();
        expect(controller.getSnapshot().isAudible).toBe(false);
        detach();
    });
});

/** MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED：斷網時第一次載入通常係呢個 */
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
const RESUME_SECONDS = 967;

/** 斷網時載入：autoplay 失敗，element 停喺 error 狀態 */
const setupOfflineLoad = async () => {
    const audio = new FakeAudio();
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    await controller.load(RECORDING, { autoplay: true });
    controller.seek(RESUME_SECONDS);
    // play event 先到（瀏覽器開始載），之後先因為斷網失敗
    await new Promise((resolve) => setTimeout(resolve, 0));
    audio.fail(MEDIA_ERR_SRC_NOT_SUPPORTED);
    return { audio, controller, detach };
};

describe('AudioController recovery after a failed load (offline)', () => {
    it('should stop showing as playing when the source fails', async () => {
        const { controller, detach } = await setupOfflineLoad();
        expect(controller.getSnapshot().isPlaying).toBe(false);
        expect(controller.hasPlayIntent()).toBe(false);
        detach();
    });

    it('should reload the source and resume where it was when Play is pressed again', async () => {
        const { audio, controller, detach } = await setupOfflineLoad();
        audio.load.mockClear();

        await controller.toggle();
        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenLastCalledWith();
        expect(audio.paused).toBe(false);

        audio.emitMetadata(1000);
        expect(audio.currentTime).toBe(RESUME_SECONDS);
        expect(controller.getSnapshot().currentTime).toBe(RESUME_SECONDS);
        detach();
    });

    it('should reload the failed source when the network comes back', async () => {
        const { audio, detach } = await setupOfflineLoad();
        audio.load.mockClear();
        audio.play.mockClear();

        window.dispatchEvent(new Event('online'));
        // 只係重新載入，等用戶自己撳 Play
        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).not.toHaveBeenCalled();
        detach();
    });

    it('should leave a healthy source alone when the network comes back', async () => {
        const { audio, detach } = await setupPlaying();
        window.dispatchEvent(new Event('online'));
        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });
});

describe('AudioController auto-advance', () => {
    const NEXT: Recording = {
        ...RECORDING,
        date: '2026-10-24',
        url: 'https://audio.hkfm903.live/next.aac',
    };

    const playToEnd = async (nextTrack?: (url: string) => Recording | undefined) => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack(nextTrack && ((track) => nextTrack(track.url)));
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(1200);
        audio.play.mockClear();
        audio.end();
        return { audio, controller, detach };
    };

    it('loads and plays the next track straight from the ended event', async () => {
        const { audio, controller, detach } = await playToEnd((url) =>
            url === RECORDING.url ? NEXT : undefined,
        );

        expect(audio.src).toBe(NEXT.url);
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(controller.getSnapshot().recording).toBe(NEXT);
        detach();
    });

    it('marks the finished track as watched before moving on', async () => {
        const { detach } = await playToEnd(() => NEXT);

        expect(JSON.parse(localStorage.getItem('903player:progress:v1') ?? '{}')).toMatchObject({
            [RECORDING.url]: { watched: true },
        });
        detach();
    });

    it('stops when there is no next track', async () => {
        const { audio, controller, detach } = await playToEnd(() => undefined);

        expect(audio.src).toBe(RECORDING.url);
        expect(audio.play).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isPlaying).toBe(false);
        detach();
    });

    it('keeps reporting playing while it switches to the next track', async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack(() => NEXT);
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(1200);
        const seen: boolean[] = [];
        controller.subscribe(() => seen.push(controller.getSnapshot().isPlaying));

        audio.end();

        expect(seen.length).toBeGreaterThan(0);
        expect(seen.every(Boolean)).toBe(true);
        detach();
    });
});

/** 鎖屏時 iOS 可能卡住唔載下一集（停喺 0:00 但顯示播緊）：等一陣冇聲就重新載入 */
describe('AudioController stalled auto-advance', () => {
    const NEXT: Recording = {
        ...RECORDING,
        date: '2026-10-24',
        url: 'https://audio.hkfm903.live/next.aac',
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const advance = async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(1200);
        audio.end();
        await Promise.resolve();
        audio.play.mockClear();
        audio.load.mockClear();
        return { audio, controller, detach };
    };

    it('reloads and replays the next track when it never starts sounding', async () => {
        const { audio, detach } = await advance();

        vi.advanceTimersByTime(STALL_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(audio.src).toBe(NEXT.url);
        detach();
    });

    it('leaves the next track alone once it is audible', async () => {
        const { audio, detach } = await advance();

        audio.emitPlaying();
        vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('gives up after the retry limit', async () => {
        const { audio, detach } = await advance();

        vi.advanceTimersByTime(STALL_RETRY_MS * (STALL_MAX_RETRIES + 2));

        expect(audio.load).toHaveBeenCalledTimes(STALL_MAX_RETRIES);
        detach();
    });

    it('stops retrying when the user pauses', async () => {
        const { audio, controller, detach } = await advance();

        controller.pause();
        vi.advanceTimersByTime(STALL_RETRY_MS);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('retries straight away when the screen wakes up while stalled', async () => {
        const { audio, detach } = await advance();
        const visibility = vi.spyOn(document, 'visibilityState', 'get');

        visibility.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(1);
        visibility.mockRestore();
        detach();
    });
});

/** iOS 喺 ended 嗰下收起 audio session，背景開唔返：要喺播完之前、仲播緊時換集 */
describe('AudioController early auto-advance', () => {
    const NEXT: Recording = {
        ...RECORDING,
        date: '2026-10-24',
        url: 'https://audio.hkfm903.live/next.aac',
    };
    const DURATION = 1200;

    const playNear = async (nextTrack: () => Recording | undefined) => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack(nextTrack);
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        await Promise.resolve();
        audio.play.mockClear();
        return { audio, controller, detach };
    };

    it('switches to the next track just before the end while still playing', async () => {
        const { audio, controller, detach } = await playNear(() => NEXT);

        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS / 2);

        expect(audio.src).toBe(NEXT.url);
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(controller.getSnapshot().recording).toBe(NEXT);
        expect(controller.getSnapshot().isPlaying).toBe(true);
        expect(JSON.parse(localStorage.getItem('903player:progress:v1') ?? '{}')).toMatchObject({
            [RECORDING.url]: { watched: true },
        });
        detach();
    });

    it('keeps playing the current track until the last moments', async () => {
        const { audio, detach } = await playNear(() => NEXT);

        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS * 2);

        expect(audio.src).toBe(RECORDING.url);
        detach();
    });

    it('does not switch while paused near the end', async () => {
        const { audio, controller, detach } = await playNear(() => NEXT);

        controller.pause();
        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS / 2);

        expect(audio.src).toBe(RECORDING.url);
        detach();
    });

    it('plays to the end when there is no next track', async () => {
        const { audio, detach } = await playNear(() => undefined);

        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS / 2);

        expect(audio.src).toBe(RECORDING.url);
        expect(audio.play).not.toHaveBeenCalled();
        detach();
    });
});
