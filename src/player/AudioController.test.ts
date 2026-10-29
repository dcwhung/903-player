import { FakeAudio, timeRanges } from '../../tests/fakeAudio';
import type { Recording } from '../types/recording';
import {
    AUDIBLE_ADVANCE_SECONDS,
    EARLY_ADVANCE_SECONDS,
    FROZEN_PLAYING_MS,
    REPLAY_RESET_SECONDS,
    STALL_DATA_AHEAD_SECONDS,
    STALL_FIRST_RETRY_MS,
    STALL_HIDDEN_MARK_MS,
    STALL_MAX_RETRIES,
    STALL_MAX_WAIT_MS,
    STALL_PROGRESS_RECHECK_MS,
    STALL_RETRY_MS,
} from '../config/constants';
import { getResumePosition, isWatched, saveProgress } from '../services/progressStore';
import { AudioController } from './AudioController';
import { HAVE_CURRENT_DATA, HAVE_ENOUGH_DATA } from './mediaReadyState';
import { readPlaybackLog } from './playbackLog';

const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/gongzi/20261017.aac',
};

/**
 * 測試失敗時都要解除綁定：expect 一紅就唔會行到測試尾嘅 detach()，controller 嘅
 * window / document listener（visibilitychange、online）會洩漏到後面嘅測試（S-594）
 */
const detachers: (() => void)[] = [];
const attachController = (controller: AudioController): (() => void) => {
    const detach = controller.attach();
    detachers.push(detach);
    return detach;
};
afterEach(() => {
    // detach 重複叫冇問題：removeEventListener / stall.cancel 都係 idempotent
    detachers.splice(0).forEach((detach) => detach());
});

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
    const detach = attachController(controller);
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
        const detach = attachController(controller);
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
    const detach = attachController(controller);
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
    const detach = attachController(controller);
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
        const detach = attachController(controller);
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
    const detach = attachController(controller);
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
        const detach = attachController(controller);
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
        const detach = attachController(controller);
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

/**
 * iOS 可能卡住唔載下一集（停喺 0:00 但顯示播緊）：前景等一陣冇聲就重新載入。
 * jsdom 預設 visible，呢度全部係前景行為；鎖屏（hidden）唔自動 reload，見 locked auto-advance（v1.20.8）
 */
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
        const detach = attachController(controller);
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

    it('retries straight away when the screen wakes up past a frozen deadline', async () => {
        const { audio, detach } = await advance();
        const visibility = vi.spyOn(document, 'visibilityState', 'get');
        // iOS 鎖屏暫停咗 JS：timer 冇行，但時間過咗 deadline
        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);

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
        const detach = attachController(controller);
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
        const detach = attachController(controller);
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
        const detach = attachController(controller);
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

        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);
        showScreen('visible');
        expect(audio.load).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(GIVE_UP_MS);

        expect(audio.load).toHaveBeenCalledTimes(STALL_MAX_RETRIES);
        detach();
    });

    // C-009：撳播之後即刻切 app / 拉通知中心再返嚟，正常載緊唔好 reload
    it('does not reload a normal start when the screen wakes up before the first deadline', async () => {
        const WAKE_AFTER_PLAY_MS = 1000;
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);

        vi.advanceTimersByTime(WAKE_AFTER_PLAY_MS);
        showScreen('visible');

        expect(audio.load).not.toHaveBeenCalled();
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
        const detach = attachController(controller);
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
        const detach = attachController(controller);
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
        const detach = attachController(controller);
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
        const detach = attachController(controller);
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
 * v1.20.8：以前假設鎖屏時都會自動 reload（錯：會 abort iOS ~4.3 s 嘅鎖屏載入）。
 * 呢度嘅 timer 規則（S-583 / W-498 / W-500 / W-505）而家只係前景（jsdom 預設 visible）；
 * 鎖屏只會喺亮屏（retryIfOverdue）或者鎖屏 Play（resume）先 reload
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
        const detach = attachController(controller);
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

    // W-498：慢網開播，buffer 一直增長（但前面數據仲未夠）就唔好 reload
    it('does not reload a slow start while the buffer keeps growing', async () => {
        const SLOW_START_CHECKS = 3;
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);
        for (let check = 1; check <= SLOW_START_CHECKS; check += 1) {
            audio.buffered = timeRanges([[audio.currentTime, audio.currentTime + check]]);
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        }

        expect(audio.load).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isStalled).toBe(false);
        detach();
    });

    it('reloads when data is buffered ahead but the position is frozen', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);
        audio.buffered = timeRanges([[0, audio.currentTime + STALL_DATA_AHEAD_SECONDS * 2]]);
        audio.readyState = HAVE_ENOUGH_DATA;

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    /**
     * S-583：spec 正常路徑 playing 喺 readyState ≥ 3 先發。情境 2（拔 AirPods → 鎖屏 Play →
     * playing + play() resolve、rs=4、位置凍結）只載到少過 STALL_DATA_AHEAD_SECONDS 都要喺首個 deadline 重試
     */
    describe('frozen after playing with playable data', () => {
        const LITTLE_AHEAD_SECONDS = STALL_DATA_AHEAD_SECONDS / 2;

        const bufferAhead = (audio: FakeAudio, seconds: number) => {
            audio.buffered = timeRanges([[audio.currentTime, audio.currentTime + seconds]]);
        };

        it('retries at the first deadline when only a little data is buffered', async () => {
            const { audio, controller, detach } = await pausedBySystem();
            await controller.play();
            bufferAhead(audio, LITTLE_AHEAD_SECONDS);
            audio.emitPlaying(HAVE_ENOUGH_DATA);

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            expect(audio.load).toHaveBeenCalledTimes(1);
            expect(controller.getSnapshot().isStalled).toBe(true);
            detach();
        });

        // 個 element 話數據夠播、buffer 仲增長但位置唔行：iOS pipeline 死咗，唔係慢網
        it('retries at the first deadline even while the buffer keeps growing', async () => {
            const { audio, controller, detach } = await pausedBySystem();
            await controller.play();
            bufferAhead(audio, 1);
            audio.emitPlaying(HAVE_ENOUGH_DATA);
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS / 2);
            bufferAhead(audio, 2);

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS / 2);

            expect(audio.load).toHaveBeenCalledTimes(1);
            detach();
        });

        // W-498：開咗播之後數據唔夠（waiting，rs 跌返）而 buffer 仲增長，係真慢網，唔好 abort
        it('keeps waiting when it went back to waiting for data and the buffer grows', async () => {
            const { audio, controller, detach } = await pausedBySystem();
            await controller.play();
            bufferAhead(audio, 1);
            audio.emitPlaying(HAVE_ENOUGH_DATA);
            audio.readyState = HAVE_CURRENT_DATA;
            audio.emitWaiting();
            bufferAhead(audio, 2);

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            expect(audio.load).not.toHaveBeenCalled();
            expect(controller.getSnapshot().isStalled).toBe(false);
            detach();
        });

        /**
         * S-586：新一次撳播係新一輪，暫停之前嗰次嘅 playing 唔算。真 element 播過再暫停 rs 已經係 4，
         * 前面只有少量數據；新 play() 之後 playing 未到而 buffer 增長，係慢網載緊（W-498），唔好 reload。
         * 舊 playing 未清就會當「話夠播但位置唔行」即刻重試
         */
        it('ignores playing from before the pause when a new play starts slowly', async () => {
            const { audio, controller, detach } = await pausedBySystem();
            audio.readyState = HAVE_ENOUGH_DATA;
            bufferAhead(audio, 1);
            await controller.play();

            bufferAhead(audio, 2);
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            expect(audio.load).not.toHaveBeenCalled();
            detach();
        });

        /**
         * S-584：每次 audio.load() 都係新嘗試。error 已設但 error event 仲 queue 緊（watchdog 未 cancel）時
         * 網絡返嚟重新載入，舊 playing 唔可以帶入新載入，否則 rs 0→2 唔算進展（W-498 退化）
         */
        it('counts playable data as progress again after the source is recovered', async () => {
            const { audio, controller, detach } = await pausedBySystem();
            await controller.play();
            bufferAhead(audio, LITTLE_AHEAD_SECONDS);
            audio.emitPlaying(HAVE_ENOUGH_DATA);
            audio.error = { code: MEDIA_ERR_SRC_NOT_SUPPORTED };

            window.dispatchEvent(new Event('online'));
            expect(audio.load).toHaveBeenCalledTimes(1);
            audio.load.mockClear();
            audio.emitLoadedData();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            expect(audio.load).not.toHaveBeenCalled();
            detach();
        });

        // 重試係新一次嘗試：重新載入之後 playing 未發，數據到（rs 0→2）照算進展（W-500 / W-498）
        it('counts playable data as progress again after the retry reloads', async () => {
            const { audio, controller, detach } = await pausedBySystem();
            await controller.play();
            bufferAhead(audio, LITTLE_AHEAD_SECONDS);
            audio.emitPlaying(HAVE_ENOUGH_DATA);
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
            await Promise.resolve();
            audio.load.mockClear();

            audio.emitMetadata(DURATION);
            audio.emitLoadedData();
            vi.advanceTimersByTime(STALL_RETRY_MS);

            expect(audio.load).not.toHaveBeenCalled();
            detach();
        });
    });

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

    it('reloads straight away when lock-screen play is pressed past a frozen deadline', async () => {
        const { audio, controller, detach, heardAt } = await pausedBySystem();
        await playFrozen(audio, controller.play);
        // iOS 鎖屏凍結咗 timer：deadline 過咗但未行
        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);

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
        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);

        await controller.resume();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(2);
        const retries = readPlaybackLog().filter((line) => line.includes(' retry '));
        expect(retries.at(-1)).toMatch(new RegExp(` left=${STALL_MAX_RETRIES}$`));
        detach();
    });

    it('reloads on lock-screen play once a retry has already marked it stalled', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        expect(controller.getSnapshot().isStalled).toBe(true);

        await controller.resume();

        expect(audio.load).toHaveBeenCalledTimes(2);
        detach();
    });

    // W-499：正常載緊（首個 deadline 之前）撳鎖屏 Play 唔好打斷
    it('just plays on lock-screen play during a normal start before the first deadline', async () => {
        const { audio, controller, detach } = await pausedBySystem();
        await playFrozen(audio, controller.play);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);

        await controller.resume();

        expect(audio.load).not.toHaveBeenCalled();
        expect(audio.play).toHaveBeenCalledTimes(2);
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

    it('retries a stalled auto-advance after the shorter first timeout in the foreground', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = attachController(controller);
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

    // W-500：新一集 metadata 到咗但數據冇嚟（readyState 0→1）都要喺首個 deadline 重試
    it('retries a stalled auto-advance at the first timeout when only metadata arrived', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        await Promise.resolve();
        audio.load.mockClear();

        audio.emitMetadata(DURATION);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(controller.getSnapshot().isStalled).toBe(true);
        detach();
    });

    // W-505：header 到咗加一個 progress 之後就冇嘢嚟，都要喺首個 deadline 重試（唔好推到 8 秒）
    it('retries at the first timeout when a progress event follows metadata and then nothing arrives', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        await Promise.resolve();
        audio.load.mockClear();

        audio.emitMetadata(DURATION);
        audio.emitProgress();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(controller.getSnapshot().isStalled).toBe(true);
        detach();
    });

    it('keeps waiting at the first timeout when playable data has started to arrive', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.end();
        await Promise.resolve();
        audio.load.mockClear();

        audio.emitMetadata(DURATION);
        audio.emitLoadedData();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isStalled).toBe(false);
        detach();
    });

    // 情境 1 前景版：timer 啱啱重試完，65 ms 後 visibility 唔會再重試多次
    it('spends one retry when a late timer and a screen wake-up land together', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const WAKE_AFTER_TIMER_MS = 65;
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = attachController(controller);
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

    // 情境 1 鎖屏版（v1.20.8）：鎖屏時 timer 行過都唔 reload，亮屏先重試一次
    it('spends only the wake-up retry when timers ran while locked', async () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const WAKE_AFTER_TIMER_MS = 65;
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        audio.end();
        await Promise.resolve();
        audio.load.mockClear();

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS + STALL_RETRY_MS + WAKE_AFTER_TIMER_MS);
        expect(audio.load).not.toHaveBeenCalled();
        visibility.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));

        const retries = readPlaybackLog().filter((line) => line.includes(' retry '));
        expect(retries).toHaveLength(1);
        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    /** C-010：只有 watchdog 首個 deadline 過咗而未出聲先算卡住（鎖屏先顯示 Play） */
    describe('isStalled', () => {
        const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.aac' };
        const OTHER: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/other.aac' };

        const stalledStart = async () => {
            const audio = new FakeAudio();
            const controller = new AudioController(audio.asAudio());
            const detach = attachController(controller);
            await controller.load(RECORDING, { autoplay: true });
            audio.emitMetadata(DURATION);
            audio.emitPlaying();
            return { audio, controller, detach };
        };

        it('is not stalled during a normal start before the first deadline', async () => {
            const { controller, detach } = await stalledStart();

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);

            expect(controller.getSnapshot().isStalled).toBe(false);
            detach();
        });

        it('is stalled once the first deadline passes without sound', async () => {
            const { controller, detach } = await stalledStart();

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            expect(controller.getSnapshot().isStalled).toBe(true);
            detach();
        });

        it('clears the stall once sound starts', async () => {
            const { audio, controller, detach } = await stalledStart();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            audio.emitMetadata(DURATION);
            audio.emitAudible();

            expect(controller.getSnapshot().isStalled).toBe(false);
            detach();
        });

        it('clears the stall when paused', async () => {
            const { controller, detach } = await stalledStart();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            controller.pause();

            expect(controller.getSnapshot().isStalled).toBe(false);
            detach();
        });

        it('clears the stall when another track is picked', async () => {
            const { controller, detach } = await stalledStart();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            await controller.load(OTHER, { autoplay: true });

            expect(controller.getSnapshot().isStalled).toBe(false);
            detach();
        });

        // S-581：出錯之後同一集再正常開播，唔可以由頭到尾顯示「停咗」
        it('clears the stall when the source fails', async () => {
            const { audio, controller, detach } = await stalledStart();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            audio.fail(2);

            expect(controller.getSnapshot().isStalled).toBe(false);
            detach();
        });

        it('does not reload on lock-screen play during a normal start after a failure', async () => {
            const { audio, controller, detach } = await stalledStart();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
            audio.fail(2);
            await controller.play();
            audio.load.mockClear();

            await controller.resume();

            expect(controller.getSnapshot().isStalled).toBe(false);
            expect(audio.load).not.toHaveBeenCalled();
            detach();
        });

        // 重試入面嘅 play() 被拒（或者用戶再撳被拒）：已經冇播緊，之後正常開播唔應該帶住「卡住」
        it('clears the stall when play() is rejected', async () => {
            const { audio, controller, detach } = await stalledStart();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
            audio.rejectPlay = true;

            await controller.play();

            expect(controller.getSnapshot().isPlaying).toBe(false);
            expect(controller.getSnapshot().isStalled).toBe(false);
            detach();
        });

        it('does not reload on lock-screen play during a normal start after a rejected play', async () => {
            const { audio, controller, detach } = await stalledStart();
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
            audio.rejectPlay = true;
            await controller.play();
            audio.rejectPlay = false;
            await controller.play();
            audio.load.mockClear();

            await controller.resume();

            expect(controller.getSnapshot().isStalled).toBe(false);
            expect(audio.load).not.toHaveBeenCalled();
            detach();
        });

        it('is not stalled while auto-advancing to the next track', async () => {
            const audio = new FakeAudio();
            const controller = new AudioController(audio.asAudio());
            controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
            const detach = attachController(controller);
            await controller.load(RECORDING, { autoplay: true });
            audio.emitMetadata(DURATION);
            const seen: boolean[] = [];
            controller.subscribe(() => seen.push(controller.getSnapshot().isStalled));

            audio.end();
            await Promise.resolve();

            expect(seen.length).toBeGreaterThan(0);
            expect(seen.some(Boolean)).toBe(false);
            detach();
        });
    });
});

/**
 * v1.20.8 回歸（v1.20.7 iPhone log，鎖屏自動接住播）：
 * 15:38:37.938 advance → .989 loadstart → 38.839 loadedmetadata → 39.041 progress →
 * 41.943 retry（~3.95 s，abort 咗載緊嘅下一集）→ 之後 iOS 喺背景再唔載完，JS 凍結 77 s，亮屏先播。
 * v1.20.6 鎖屏 loadstart → loadeddata 要 ~4.3 s，冇重試就播到。
 * 規則：鎖屏（hidden）永遠唔自動 reload；過咗 STALL_HIDDEN_MARK_MS 先標 isStalled（鎖屏顯示 Play），
 * 鎖屏 Play / 亮屏先 reload
 */
describe('AudioController locked auto-advance (v1.20.8)', () => {
    const NEXT: Recording = { ...RECORDING, url: 'https://audio.hkfm903.live/next.m4a' };
    const DURATION = 845.6;
    const NEXT_DURATION = 898.4;
    /** log：advance → loadedmetadata 0.9 s，再 0.2 s 一個 progress */
    const METADATA_AFTER_MS = 900;
    const PROGRESS_AFTER_METADATA_MS = 200;
    /** v1.20.6 log：鎖屏 loadstart → loadeddata 4.07 s（advance 計約 4.3 s） */
    const LOCKED_DATA_AFTER_MS = 4300;
    /** log：凍結 77 s 之後用戶亮屏 */
    const LOCKED_MS = 77_000;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const setScreen = (state: DocumentVisibilityState) => {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
        document.dispatchEvent(new Event('visibilitychange'));
    };

    /** 鎖屏聽緊 → 自動接住播下一集 → metadata + 一個 progress（同 log 一樣） */
    const lockedAdvance = async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        controller.setNextTrack((track) => (track.url === RECORDING.url ? NEXT : undefined));
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.emitAudible();
        setScreen('hidden');
        audio.end();
        await Promise.resolve();
        audio.load.mockClear();
        audio.play.mockClear();
        const stalledSeen: boolean[] = [];
        controller.subscribe(() => stalledSeen.push(controller.getSnapshot().isStalled));

        vi.advanceTimersByTime(METADATA_AFTER_MS);
        audio.emitMetadata(NEXT_DURATION);
        vi.advanceTimersByTime(PROGRESS_AFTER_METADATA_MS);
        audio.emitProgress();
        return { audio, controller, detach, stalledSeen };
    };

    const retryLines = () => readPlaybackLog().filter((line) => line.includes(' retry '));

    it('lets a normal ~4.3 s locked load finish and play without reloading', async () => {
        const { audio, controller, detach, stalledSeen } = await lockedAdvance();

        vi.advanceTimersByTime(
            LOCKED_DATA_AFTER_MS - METADATA_AFTER_MS - PROGRESS_AFTER_METADATA_MS,
        );
        audio.emitLoadedData();
        audio.emitAudible();
        vi.advanceTimersByTime(STALL_MAX_WAIT_MS);

        expect(audio.src).toBe(NEXT.url);
        expect(audio.load).not.toHaveBeenCalled();
        expect(retryLines()).toHaveLength(0);
        expect(controller.getSnapshot().isAudible).toBe(true);
        expect(stalledSeen.some(Boolean)).toBe(false);
        detach();
    });

    it('never reloads while locked when the data never arrives', async () => {
        const { audio, detach } = await lockedAdvance();

        vi.advanceTimersByTime(LOCKED_MS);

        expect(audio.load).not.toHaveBeenCalled();
        expect(retryLines()).toHaveLength(0);
        detach();
    });

    it('shows the lock screen as stalled only after the hidden grace', async () => {
        const { controller, detach } = await lockedAdvance();
        const elapsed = METADATA_AFTER_MS + PROGRESS_AFTER_METADATA_MS;

        vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS - elapsed - 1);
        expect(controller.getSnapshot().isStalled).toBe(false);
        vi.advanceTimersByTime(1);

        expect(controller.getSnapshot().isStalled).toBe(true);
        detach();
    });

    it('reloads on lock-screen play once marked stalled, with a fresh retry budget', async () => {
        const { audio, controller, detach } = await lockedAdvance();
        vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS);

        await controller.resume();

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(retryLines().at(-1)).toMatch(/remote$/);
        expect(controller.getSnapshot().isStalled).toBe(false);
        detach();
    });

    it('reloads once when the screen wakes up past the deadline', async () => {
        const { audio, detach } = await lockedAdvance();
        vi.advanceTimersByTime(LOCKED_MS);

        setScreen('visible');

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(retryLines().at(-1)).toMatch(new RegExp(`left=${STALL_MAX_RETRIES}$`));
        detach();
    });

    it('reloads on wake-up even when the JS timers were frozen the whole time', async () => {
        const { audio, detach } = await lockedAdvance();
        // iOS 凍結 JS：timer 冇行，但 wall clock 照行
        vi.setSystemTime(Date.now() + LOCKED_MS);

        setScreen('visible');

        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    it('does not reload on wake-up before the first deadline', async () => {
        const { audio, detach } = await lockedAdvance();

        setScreen('visible');

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    it('goes back to the foreground retry schedule after waking up', async () => {
        const { audio, detach } = await lockedAdvance();
        vi.advanceTimersByTime(LOCKED_MS);
        setScreen('visible');
        expect(audio.load).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(STALL_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(2);
        detach();
    });
});

/**
 * v1.20.9 回歸（v1.20.8 iPhone log，鎖屏拔 AirPods 5 s 再插返、鎖屏 Play 冇聲，鎖屏時間照行）：
 * 17:38:39.563 ms:pause ct=28.9 rs=4 vis=h（AirPods 拔走，之前位置真係行緊）
 * 17:38:45.465 ms:play → .487 play / playing / play() resolved，ct 凍結 28.9、buf=859.5（成集已載）
 * 17:38:52.354 ms:pause → 52.935 ms:play → playing（仍然凍結）→ 57.565 ms:pause → 17:39:02 亮屏
 * v1.20.8 鎖屏唔 reload，每次 ms:play 又由頭計，12 s mark 永遠到唔到。
 * 規則：鎖屏時 playing 已發、rs ≥ 3 而位置唔行 = pipeline 死咗，數據喺本機，照樣 reload；
 * 鎖屏 Play 見到上一次嘗試係咁就即刻 reload。仲載緊（冇 playing / rs ≤ 2）維持 v1.20.8
 */
describe('AudioController hidden frozen playing (v1.20.9)', () => {
    const DURATION = 859.5;
    const HEARD_AT = 24.7;
    /** log：AirPods 拔走前位置行到 28.9 */
    const PAUSED_AT = 28.9;
    /** log：playing 17:38:45.488 → ms:pause 17:38:52.354 */
    const FROZEN_BEFORE_PAUSE_MS = 6866;
    /** log：ms:play 17:38:45.465 → playing 17:38:45.488（約 22 ms） */
    const PLAY_TO_PLAYING_MS = 22;
    /** W-507：過咗凍結門檻時，位置已經靜靜雞行咗（夠出聲門檻），冇 timeupdate */
    const SILENT_AUDIBLE_SECONDS = 0.5;
    /** W-506：playing 喺 deadline 前幾耐先到（快嘅鎖屏載入） */
    const PLAYING_BEFORE_DEADLINE_MS = 2000;
    /** deadline 前 100 ms 先開始出聲（playing 之後 1.9 s） */
    const SILENT_STEP_MS = 100;
    /** 出聲咗 0.1 s：未過出聲門檻，冇 timeupdate */
    const SILENT_ADVANCE_SECONDS = 0.1;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const setScreen = (state: DocumentVisibilityState) => {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
        document.dispatchEvent(new Event('visibilitychange'));
    };

    /** 鎖屏聽緊（成集已載）→ 拔 AirPods：iOS 送 ms:pause */
    const lockedListeningThenPaused = async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.buffered = timeRanges([[0, DURATION]]);
        audio.emitPlaying(HAVE_ENOUGH_DATA);
        audio.emitTime(HEARD_AT);
        audio.emitTime(PAUSED_AT);
        setScreen('hidden');
        controller.pause();
        audio.load.mockClear();
        audio.play.mockClear();
        return { audio, controller, detach };
    };

    /** 鎖屏 Play：play / playing / play() resolve，但位置凍結（冇 timeupdate）；log：playing 喺 Play 後 22 ms */
    const lockScreenPlayFrozen = async (audio: FakeAudio, controller: AudioController) => {
        await controller.resume();
        vi.advanceTimersByTime(PLAY_TO_PLAYING_MS);
        audio.emitPlaying(HAVE_ENOUGH_DATA);
    };

    const retryLines = () => readPlaybackLog().filter((line) => line.includes(' retry '));

    it('reloads at the first deadline while locked when playing froze with the data present', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await lockScreenPlayFrozen(audio, controller);
        expect(audio.load).not.toHaveBeenCalled();

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(audio.play).toHaveBeenCalledTimes(2);
        expect(controller.getSnapshot().isStalled).toBe(true);
        expect(retryLines()).toEqual([
            expect.stringMatching(new RegExp(` left=${STALL_MAX_RETRIES}$`)),
        ]);
        audio.emitMetadata(DURATION);
        expect(audio.currentTime).toBe(PAUSED_AT);
        detach();
    });

    it('reloads straight away on the next lock-screen play after a frozen attempt', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await lockScreenPlayFrozen(audio, controller);
        // iOS 凍結咗 timer：deadline 冇行過，用戶喺鎖屏暫停再撳 Play
        vi.setSystemTime(Date.now() + FROZEN_BEFORE_PAUSE_MS);
        controller.pause();
        expect(audio.load).not.toHaveBeenCalled();

        await controller.resume();

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(retryLines()).toEqual([expect.stringMatching(/ remote$/)]);
        audio.emitMetadata(DURATION);
        expect(audio.currentTime).toBe(PAUSED_AT);
        detach();
    });

    /**
     * W-506 / W-507：鎖屏 timeupdate 約 5 秒先一次，位置靜靜雞行；playing 喺 deadline 前 2 秒先到、
     * 再慢 1.9 秒先出聲（健康）都唔可以當凍結 reload（會重演 v1.20.7 鎖屏 abort）
     */
    // W-508：凍結門檻要短過第一個 deadline，log 嘅 22 ms playing 先會喺 4 s 就 reload
    it('keeps the frozen limit shorter than the first stall deadline', () => {
        expect(FROZEN_PLAYING_MS).toBeLessThan(STALL_FIRST_RETRY_MS - PLAY_TO_PLAYING_MS);
    });

    // W-507：判斷凍結要讀 element 嘅即時位置，唔好靠鎖屏時好疏嘅 timeupdate
    it('does not reload at the deadline when the position moved without any timeupdate', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await controller.resume();
        vi.advanceTimersByTime(PLAY_TO_PLAYING_MS);
        audio.emitPlaying(HAVE_ENOUGH_DATA);
        audio.currentTime += SILENT_AUDIBLE_SECONDS; // 出咗聲，鎖屏未發 timeupdate

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - PLAY_TO_PLAYING_MS);

        expect(audio.load).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isStalled).toBe(false);
        detach();
    });

    it('does not reload a healthy locked start whose sound begins late with throttled timeupdates', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await controller.resume();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - PLAYING_BEFORE_DEADLINE_MS);
        audio.emitPlaying(HAVE_ENOUGH_DATA);
        vi.advanceTimersByTime(PLAYING_BEFORE_DEADLINE_MS - SILENT_STEP_MS);
        audio.currentTime += SILENT_ADVANCE_SECONDS; // 出咗聲，但鎖屏未發 timeupdate

        vi.advanceTimersByTime(SILENT_STEP_MS);

        expect(audio.load).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isStalled).toBe(false);
        detach();
    });

    // iOS 鎖屏凍結 timer：deadline 冇行過，時鐘已經過咗 FROZEN_PLAYING_MS
    it('reloads on the next lock-screen play once frozen past the limit while timers were frozen', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await lockScreenPlayFrozen(audio, controller);
        vi.setSystemTime(Date.now() + FROZEN_PLAYING_MS);
        controller.pause();

        await controller.resume();

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(retryLines()).toEqual([expect.stringMatching(/ remote$/)]);
        detach();
    });

    it('reloads on lock-screen play pressed again while still frozen without a pause', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await lockScreenPlayFrozen(audio, controller);
        vi.setSystemTime(Date.now() + FROZEN_PLAYING_MS);

        await controller.resume();

        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    it('only reloads once for a frozen attempt, then starts a fresh one', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await lockScreenPlayFrozen(audio, controller);
        vi.setSystemTime(Date.now() + FROZEN_BEFORE_PAUSE_MS);
        controller.pause();
        await controller.resume();
        audio.emitMetadata(DURATION);
        audio.emitPlaying(HAVE_ENOUGH_DATA);
        audio.emitTime(PAUSED_AT + 1);
        controller.pause();

        await controller.resume();

        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    it('just plays on lock-screen play after a healthy locked pause and resume', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await controller.resume();
        audio.emitPlaying(HAVE_ENOUGH_DATA);
        audio.emitTime(PAUSED_AT + 1);
        vi.advanceTimersByTime(FROZEN_BEFORE_PAUSE_MS);
        controller.pause();

        await controller.resume();
        audio.emitPlaying(HAVE_ENOUGH_DATA);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);
        audio.emitTime(PAUSED_AT + 2);
        vi.advanceTimersByTime(STALL_MAX_WAIT_MS);

        expect(audio.load).not.toHaveBeenCalled();
        expect(audio.play).toHaveBeenCalledTimes(2);
        expect(controller.getSnapshot().isStalled).toBe(false);
        detach();
    });

    it('just plays on lock-screen play when paused right after playing, before it could advance', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        await lockScreenPlayFrozen(audio, controller);
        vi.advanceTimersByTime(FROZEN_PLAYING_MS - 1);
        controller.pause();

        await controller.resume();

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    // 仲載緊（playing 已發但冇可播數據，S-551 iOS 早發 playing）：維持 v1.20.8，唔 reload
    it('does not reload while locked when playing fired without playable data', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        audio.readyState = HAVE_CURRENT_DATA;
        await controller.resume();
        audio.emitPlaying();

        vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS - 1);

        expect(audio.load).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isStalled).toBe(false);
        detach();
    });

    it('keeps the foreground first retry for a frozen resume', async () => {
        const { audio, controller, detach } = await lockedListeningThenPaused();
        setScreen('visible');
        await controller.play();
        audio.emitPlaying(HAVE_ENOUGH_DATA);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(retryLines()).toEqual([
            expect.stringMatching(new RegExp(` left=${STALL_MAX_RETRIES}$`)),
        ]);
        detach();
    });
});

/**
 * CUI-0011：極慢網（< ~0.5 Mbps）開播，Chromium 喺 metadata 到之前 buffered 空、readyState 0，
 * 只有 progress event 話 bytes 入緊。當冇進展就會 4 / 12 / 20 s reload，每次由 byte 0 再下載
 */
describe('AudioController CUI-0011 slow header', () => {
    const DURATION = 798.3;
    const RESUME_AT = 521.4;
    /** spec：下載緊大約每 350 ms 發一次 progress */
    const PROGRESS_INTERVAL_MS = 350;
    const LITTLE_AHEAD_SECONDS = STALL_DATA_AHEAD_SECONDS / 2;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    /** 開播：play event 到咗，watchdog 開始睇住，乜數據都未到 */
    const slowStart = async () => {
        saveProgress(RECORDING.url, RESUME_AT, DURATION);
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = attachController(controller);
        await controller.load(RECORDING, { autoplay: true });
        await Promise.resolve();
        audio.load.mockClear();
        return { audio, controller, detach };
    };

    /** bytes 慢慢入：每 PROGRESS_INTERVAL_MS 發一次 progress，共 durationMs */
    const trickle = (audio: FakeAudio, durationMs: number) => {
        let elapsed = 0;
        while (elapsed < durationMs) {
            audio.emitProgress();
            const step = Math.min(PROGRESS_INTERVAL_MS, durationMs - elapsed);
            vi.advanceTimersByTime(step);
            elapsed += step;
        }
    };

    it('should not reload a slow header before the cap while progress events keep firing', async () => {
        const { audio, controller, detach } = await slowStart();

        trickle(audio, STALL_MAX_WAIT_MS - 1);

        expect(audio.load).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isStalled).toBe(false);
        // 上限照用：永遠載唔完嘅 trickle 最終都會重試
        trickle(audio, 1);
        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    // S-551 情境 1：轉網絡之後乜都冇嚟，冇 progress event
    it('should retry at the first deadline when no progress event fires', async () => {
        const { audio, controller, detach } = await slowStart();

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);
        expect(audio.load).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(controller.getSnapshot().isStalled).toBe(true);
        detach();
    });

    // 載咗一陣之後斷咗：progress 停咗就唔再算進展
    it('should retry at the next deadline once progress events stop', async () => {
        const { audio, detach } = await slowStart();

        trickle(audio, STALL_FIRST_RETRY_MS);
        expect(audio.load).not.toHaveBeenCalled();
        vi.advanceTimersByTime(STALL_PROGRESS_RECHECK_MS - 1);
        expect(audio.load).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    // 重試之後 bytes 再入：新嘗試照算 progress（唔會因為上一次嘅計數而當冇進展）
    it('should keep waiting after a retry while progress events fire again', async () => {
        const { audio, detach } = await slowStart();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        await Promise.resolve();
        audio.load.mockClear();

        trickle(audio, STALL_RETRY_MS);

        expect(audio.load).not.toHaveBeenCalled();
        detach();
    });

    /** S-583：playing 已發而位置凍結，下載緊都唔等（情境 2 pipeline 死咗） */
    describe('after playing has fired', () => {
        it('should still retry at the first deadline when frozen with playable data', async () => {
            const { audio, detach } = await slowStart();
            audio.emitMetadata(DURATION);
            audio.buffered = timeRanges([
                [audio.currentTime, audio.currentTime + LITTLE_AHEAD_SECONDS],
            ]);
            audio.emitPlaying(HAVE_ENOUGH_DATA);

            trickle(audio, STALL_FIRST_RETRY_MS);

            expect(audio.load).toHaveBeenCalledTimes(1);
            detach();
        });

        // iOS S-551：發咗 playing 但乜都未載到，只有 progress
        it('should still retry at the first deadline when playing fired with nothing loaded', async () => {
            const { audio, detach } = await slowStart();
            audio.emitPlaying();

            trickle(audio, STALL_FIRST_RETRY_MS);

            expect(audio.load).toHaveBeenCalledTimes(1);
            detach();
        });
    });
});
