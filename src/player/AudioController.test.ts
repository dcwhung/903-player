import { FakeAudio } from '../../tests/fakeAudio';
import type { Recording } from '../types/recording';
import {
    AUDIBLE_ADVANCE_SECONDS,
    EARLY_ADVANCE_SECONDS,
    REPLAY_RESET_SECONDS,
    STALL_FIRST_RETRY_MS,
    STALL_MAX_RETRIES,
    STALL_RETRY_MS,
} from '../config/constants';
import { getResumePosition, isWatched, saveProgress } from '../services/progressStore';
import { AudioController } from './AudioController';
import { readPlaybackLog } from './playbackLog';

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

        audio.emitAudible();
        expect(controller.getSnapshot().isAudible).toBe(true);
        detach();
    });

    it('should go silent while buffering and resume when data arrives', async () => {
        const { audio, controller, detach } = await setupPlaying();
        audio.emitAudible();

        audio.emitWaiting();
        expect(controller.getSnapshot().isAudible).toBe(false);

        audio.emitAudible();
        expect(controller.getSnapshot().isAudible).toBe(true);
        detach();
    });

    it('should go silent when paused or ended', async () => {
        const { audio, controller, detach } = await setupPlaying();
        audio.emitAudible();
        audio.pause();
        expect(controller.getSnapshot().isAudible).toBe(false);

        await controller.play();
        audio.emitAudible();
        audio.end();
        expect(controller.getSnapshot().isAudible).toBe(false);
        detach();
    });

    // S-551：iOS 拔 AirPods 之後喺鎖屏撳 Play，有 playing event 但位置凍結 82 秒、冇聲
    it('should stay silent on a playing event while the position is frozen', async () => {
        const { audio, controller, detach } = await setupPlaying();

        audio.emitPlaying();
        audio.emitTime(audio.currentTime);

        expect(controller.getSnapshot().isAudible).toBe(false);
        detach();
    });

    it('should stay silent while the position moves less than the audible threshold', async () => {
        const { audio, controller, detach } = await setupPlaying();
        audio.emitPlaying();

        audio.emitTime(audio.currentTime + AUDIBLE_ADVANCE_SECONDS / 2);

        expect(controller.getSnapshot().isAudible).toBe(false);
        detach();
    });

    it('should not count a seek jump as sound', async () => {
        const SEEK_TO = 300;
        const { audio, controller, detach } = await setupPlaying();
        audio.emitPlaying();

        controller.seek(SEEK_TO);
        audio.emitTime(SEEK_TO);

        expect(controller.getSnapshot().isAudible).toBe(false);
        detach();
    });

    it('should not count the resume jump on metadata as sound', async () => {
        const RESUME_AT = 521.4;
        saveProgress(RECORDING.url, RESUME_AT, 1000);
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitPlaying();

        audio.emitMetadata(1000);
        audio.emitTime(RESUME_AT);

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

        audio.emitMetadata(1200);
        audio.emitAudible();
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

/** iPhone Safari 拒絕 R2 嘅 CORS fetch（v1.15.9 實機 log：Load failed | no-cors ok），預載只會同播放器爭網絡 */
describe('AudioController next track loading', () => {
    const NEXT: Recording = {
        ...RECORDING,
        date: '2026-10-24',
        url: 'https://audio.hkfm903.live/next.aac',
    };

    it('streams the next track itself without any extra download', async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(1200);
        await Promise.resolve();

        audio.end();

        expect(fetch).not.toHaveBeenCalled();
        expect(audio.src).toBe(NEXT.url);
        detach();
    });
});

/** 鎖屏重試嘅細節（重試次數、亮屏、取消時機）：拆 StallWatchdog 之前鎖死現有行為 */
describe('AudioController stall watchdog details', () => {
    const NEXT: Recording = {
        ...RECORDING,
        date: '2026-10-24',
        url: 'https://audio.hkfm903.live/next.aac',
    };
    const OTHER: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/other.aac' };
    const DURATION = 1200;
    const RESUME_AT = 300;
    const GIVE_UP_MS = STALL_RETRY_MS * (STALL_MAX_RETRIES + 2);

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const advance = async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        await Promise.resolve();
        audio.play.mockClear();
        audio.load.mockClear();
        return { audio, controller, detach };
    };

    const showScreen = (state: DocumentVisibilityState) => {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
        document.dispatchEvent(new Event('visibilitychange'));
    };

    it('logs every retry with the retries left, counting down', async () => {
        const { detach } = await advance();

        vi.advanceTimersByTime(GIVE_UP_MS);

        const notes = readPlaybackLog()
            .filter((line) => line.includes(' retry '))
            .map((line) => line.split(' ').at(-1));
        const expected = Array.from(
            { length: STALL_MAX_RETRIES },
            (_, index) => `left=${STALL_MAX_RETRIES - index}`,
        );
        expect(notes).toEqual(expected);
        detach();
    });

    it('resumes the stalled track where it was after reloading it', async () => {
        saveProgress(NEXT.url, RESUME_AT, DURATION);
        const { audio, detach } = await advance();
        audio.emitMetadata(DURATION);
        expect(audio.currentTime).toBe(RESUME_AT);

        vi.advanceTimersByTime(STALL_RETRY_MS);
        expect(audio.currentTime).toBe(0);
        audio.emitMetadata(DURATION);

        expect(audio.currentTime).toBe(RESUME_AT);
        detach();
    });

    it('counts a screen wake-up retry against the retry limit', async () => {
        const { audio, detach } = await advance();

        showScreen('visible');
        expect(audio.load).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(GIVE_UP_MS);

        expect(audio.load).toHaveBeenCalledTimes(STALL_MAX_RETRIES);
        detach();
    });

    it('does not retry when the screen goes dark', async () => {
        const { audio, detach } = await advance();

        showScreen('hidden');

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('ignores a screen wake-up once the next track is audible', async () => {
        const { audio, detach } = await advance();

        audio.emitMetadata(DURATION);
        audio.emitAudible();
        showScreen('visible');

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('stops watching once the user picks another track', async () => {
        const { audio, controller, detach } = await advance();

        await controller.load(OTHER);
        vi.advanceTimersByTime(GIVE_UP_MS);

        expect(audio.src).toBe(OTHER.url);
        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('stops watching when detached', async () => {
        const { audio, detach } = await advance();

        detach();
        vi.advanceTimersByTime(GIVE_UP_MS);

        expect(audio.load).not.toHaveBeenCalled();
    });

    it('stops watching on a system pause', async () => {
        const { audio, detach } = await advance();

        audio.pause(); // 例如拔耳筒
        vi.advanceTimersByTime(GIVE_UP_MS);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('gives up for good once play intent was lost when the timer fired', async () => {
        const { audio, detach } = await advance();

        audio.dispatchEvent(new Event('error'));
        vi.advanceTimersByTime(STALL_RETRY_MS);
        showScreen('visible');
        vi.advanceTimersByTime(GIVE_UP_MS);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });
});

/** 聽過嘅集重播計時：拆 ReplayTracker 之前鎖死門檻同只清一次 */
describe('AudioController replay timing details', () => {
    const NEXT: Recording = {
        ...RECORDING,
        date: '2026-10-24',
        url: 'https://audio.hkfm903.live/next.aac',
    };
    const DURATION = 1000;
    // 模擬瀏覽器每 0.25 秒發一次 timeupdate
    const TICK_SECONDS = 0.25;

    const playThrough = (audio: FakeAudio, from: number, to: number) => {
        for (let t = from; t <= to; t += TICK_SECONDS) {
            audio.emitTime(t);
        }
    };

    const replayWatched = async () => {
        saveProgress(RECORDING.url, DURATION, DURATION);
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        return { audio, controller, detach };
    };

    it('keeps watched just short of the replay threshold', async () => {
        const { audio, detach } = await replayWatched();

        playThrough(audio, 0, REPLAY_RESET_SECONDS - TICK_SECONDS);

        expect(isWatched(RECORDING.url)).toBe(true);
        detach();
    });

    it('clears watched at exactly the replay threshold', async () => {
        const { audio, detach } = await replayWatched();

        playThrough(audio, 0, REPLAY_RESET_SECONDS);

        expect(isWatched(RECORDING.url)).toBe(false);
        detach();
    });

    it('clears watched only once per replay', async () => {
        const { audio, controller, detach } = await replayWatched();
        const revision = controller.getSnapshot().watchedRevision;

        playThrough(audio, 0, REPLAY_RESET_SECONDS * 3);

        expect(controller.getSnapshot().watchedRevision).toBe(revision + 1);
        detach();
    });

    it('does not count replay time on a track that was never watched', async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        const revision = controller.getSnapshot().watchedRevision;

        playThrough(audio, 0, REPLAY_RESET_SECONDS * 2);

        expect(controller.getSnapshot().watchedRevision).toBe(revision);
        detach();
    });

    it('starts replay timing from the new track, not where the old one stopped', async () => {
        const WATCHED: Recording = { ...NEXT, url: 'https://audio.hkfm903.live/watched.aac' };
        const OLD_POSITION = 2;
        saveProgress(WATCHED.url, DURATION, DURATION);
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitTime(OLD_POSITION);

        await controller.load(WATCHED, { autoplay: true });
        audio.emitMetadata(DURATION);
        playThrough(audio, TICK_SECONDS, REPLAY_RESET_SECONDS);

        expect(isWatched(WATCHED.url)).toBe(false);
        detach();
    });

    it('counts replay time on a watched track reached by auto-advance', async () => {
        saveProgress(NEXT.url, DURATION, DURATION);
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack(() => NEXT);
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        await Promise.resolve();
        audio.emitMetadata(DURATION);

        playThrough(audio, 0, REPLAY_RESET_SECONDS);

        expect(controller.getSnapshot().recording).toBe(NEXT);
        expect(isWatched(NEXT.url)).toBe(false);
        detach();
    });

    // S-550：斷網重載之後，iOS 可能喺 metadata 到之前發 timeupdate（位置 0），跳返續播位置唔可以當收聽時間
    it('does not count the resume jump when a timeupdate slips in before metadata', async () => {
        const RESUME_AT = 6;
        const { audio, detach } = await replayWatched();
        playThrough(audio, 0, RESUME_AT);
        audio.fail(2);
        window.dispatchEvent(new Event('online'));
        // iOS 唔跟 spec：metadata 未到、duration 仲係舊值時已經發 timeupdate
        audio.duration = DURATION;
        audio.emitTime(0);
        audio.emitMetadata(DURATION);
        audio.paused = false;

        playThrough(audio, RESUME_AT + TICK_SECONDS, RESUME_AT + 1);

        expect(isWatched(RECORDING.url)).toBe(true);
        detach();
    });
});

/**
 * S-551 iPhone 實機 log 重現：
 * 情境 1：鎖屏、轉過網絡、自動接住播 → stalled，第二個 timer 被 iOS 暫停 34 秒，亮屏時 timer + visibility 連住重試兩次
 * 情境 2：AirPods 斷線系統暫停，之後喺鎖屏撳 Play → playing 但位置凍結 82 秒、冇聲，鎖屏進度條照行
 */
describe('AudioController S-551 lock-screen stall', () => {
    const DURATION = 798.3;
    const RESUME_AT = 521.4;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    /** 情境 2：聽緊（位置真係行）→ 拔 AirPods 系統暫停 */
    const pausedBySystem = async () => {
        saveProgress(RECORDING.url, RESUME_AT, DURATION);
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitAudible();
        // 最後真正播到嘅位置（續播位置再行咗少少）
        const heardAt = audio.currentTime;
        audio.pause();
        audio.load.mockClear();
        audio.play.mockClear();
        return { audio, controller, detach, heardAt };
    };

    /** play / playing 都到，play() resolve，但位置凍結（冇 timeupdate） */
    const playFrozen = async (audio: FakeAudio, play: () => Promise<void>) => {
        await play();
        audio.emitPlaying();
    };

    it('reloads and resumes where it was when a resumed play never advances', async () => {
        const { audio, controller, detach, heardAt } = await pausedBySystem();
        await playFrozen(audio, controller.play);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(2);
        audio.emitMetadata(DURATION);
        expect(audio.currentTime).toBe(heardAt);
        detach();
    });

    it('reloads straight away when lock-screen play is pressed while stalled', async () => {
        const { audio, controller, detach, heardAt } = await pausedBySystem();
        await playFrozen(audio, controller.play);

        await controller.resume();

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(2);
        audio.emitMetadata(DURATION);
        expect(audio.currentTime).toBe(heardAt);
        const retries = readPlaybackLog().filter((line) => line.includes(' retry '));
        expect(retries).toEqual([expect.stringMatching(/ remote$/)]);
        detach();
    });

    it('gives lock-screen play a fresh retry budget while stalled', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);

        await controller.resume();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(2);
        const retries = readPlaybackLog().filter((line) => line.includes(' retry '));
        expect(retries.at(-1)).toMatch(new RegExp(` left=${STALL_MAX_RETRIES}$`));
        detach();
    });

    it('just plays on lock-screen play when paused normally', async () => {
        const { audio, controller, detach } = await pausedBySystem();

        await controller.resume();

        expect(audio.load).not.toHaveBeenCalled();
        expect(audio.play).toHaveBeenCalledTimes(1);
        detach();
    });

    it('just plays on lock-screen play while audible', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await controller.play();
        audio.emitAudible();

        await controller.resume();

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('does not reload before the first stall timeout', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('leaves a resumed play alone once the position advances', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);

        audio.emitAudible();
        vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('does not retry once the user pauses again', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);

        controller.pause();
        vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('does not watch a play() call while already audible', async () => {
        const { audio, controller, detach } = await setupPlaying();
        audio.emitAudible();
        audio.load.mockClear();

        await controller.load(RECORDING, { autoplay: true });
        vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('never advances the saved or shown position while stalled', async () => {
        const { audio, controller, detach, heardAt } = await pausedBySystem();
        await playFrozen(audio, controller.play);

        audio.emitTime(heardAt);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        audio.emitMetadata(DURATION);

        expect(controller.getSnapshot().currentTime).toBe(heardAt);
        expect(controller.getSnapshot().isAudible).toBe(false);
        expect(getResumePosition(RECORDING.url)).toBe(heardAt);
        detach();
    });

    it('retries a stalled auto-advance after the shorter first timeout', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        await Promise.resolve();
        audio.load.mockClear();

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.src).toBe(NEXT.url);
        detach();
    });

    // 情境 1：10:02:52.342 遲咗嘅 timer 重試，65 ms 後亮屏又重試一次，嘥咗一次機會
    it('spends one retry when a late timer and a screen wake-up land together', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const WAKE_AFTER_TIMER_MS = 65;
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        await Promise.resolve();
        audio.load.mockClear();

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS + STALL_RETRY_MS + WAKE_AFTER_TIMER_MS);
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));

        const retries = readPlaybackLog().filter((line) => line.includes(' retry '));
        expect(retries).toHaveLength(2);
        expect(audio.load).toHaveBeenCalledTimes(2);
        detach();
    });
});
