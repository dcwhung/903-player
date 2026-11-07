/*
 * 除 AirPods 再戴返、鎖屏撳 Play（2026-11-04 實機 log）：
 * - 09:34 情境：ms:play 後發咗 playing 但位置凍結 22 秒，iOS 凍結 JS，watchdog timer 冇行（nudge）
 * - 10:31 情境：ms:play 後 1–2 秒內 iOS 系統直接 pause（冇 ms:pause），AirPods 仲連緊線（auto-resume）
 */
import { FakeAudio, timeRanges } from '../../tests/fakeAudio';
import {
    FROZEN_PLAYING_MS,
    REMOTE_AUTO_RESUME_MAX,
    REMOTE_AUTO_RESUME_WINDOW_MS,
} from '../config/constants';
import type { Recording } from '../types/recording';
import { AudioController } from './AudioController';
import { HAVE_ENOUGH_DATA } from './mediaReadyState';
import { readPlaybackLog } from './playbackLog';

const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    id: 'id:https://audio.hkfm903.live/gongzi/20261017.aac',
    url: 'https://audio.hkfm903.live/gongzi/20261017.aac',
};
const DURATION = 958.7;
/** log：拔 AirPods 嗰陣播到 237.2 */
const PAUSED_AT = 237.2;
/** log：10:32:00.686 ms:play → 10:32:02.145 系統 pause */
const SYSTEM_PAUSE_AFTER_MS = 1459;

const logLines = (event: string) => readPlaybackLog().filter((l) => l.includes(` ${event} `));

const setScreen = (state: DocumentVisibilityState) =>
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);

/** 聽緊（成集已載）→ ms:pause（拔 AirPods） */
const pausedMidEpisode = async (screen: DocumentVisibilityState, bufferedTo: number = DURATION) => {
    const audio = new FakeAudio();
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    await controller.load(RECORDING, { autoplay: true });
    audio.emitMetadata(DURATION);
    audio.buffered = timeRanges([[0, bufferedTo]]);
    audio.emitPlaying(HAVE_ENOUGH_DATA);
    audio.emitTime(PAUSED_AT);
    setScreen(screen);
    controller.pause();
    audio.play.mockClear();
    const seeks: number[] = [];
    let position = audio.currentTime;
    Object.defineProperty(audio, 'currentTime', {
        configurable: true,
        get: () => position,
        set: (value: number) => {
            seeks.push(value);
            position = value;
        },
    });
    return { audio, controller, detach, seeks };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('AudioController remote resume nudge (AirPods back, locked)', () => {
    it('re-seeks to the paused position before playing when resumed from the lock screen', async () => {
        const { audio, controller, detach, seeks } = await pausedMidEpisode('hidden');

        await controller.resume();

        expect(seeks).toEqual([PAUSED_AT]);
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(audio.load).toHaveBeenCalledTimes(0);
        expect(logLines('nudge')).toHaveLength(1);
        detach();
    });

    it('does not seek into data that is not downloaded yet (would refetch in the background)', async () => {
        const { controller, detach, seeks } = await pausedMidEpisode('hidden', PAUSED_AT + 1);

        await controller.resume();

        expect(seeks).toEqual([]);
        detach();
    });

    it('leaves the position alone when resumed with the app on screen', async () => {
        const { controller, detach, seeks } = await pausedMidEpisode('visible');

        await controller.resume();

        expect(seeks).toEqual([]);
        expect(logLines('nudge')).toHaveLength(0);
        detach();
    });
});

describe('AudioController auto-resume after a system pause (AirPods reconnecting)', () => {
    /** 鎖屏 Play 之後開始播 */
    const resumed = async () => {
        const ctx = await pausedMidEpisode('hidden');
        await ctx.controller.resume();
        ctx.audio.emitPlaying(HAVE_ENOUGH_DATA);
        ctx.audio.play.mockClear();
        return ctx;
    };

    it('plays again when iOS pauses by itself right after a lock-screen play', async () => {
        const { audio, controller, detach } = await resumed();
        vi.advanceTimersByTime(SYSTEM_PAUSE_AFTER_MS);

        audio.pause(); // 系統直接停（唔經 controller，冇 ms:pause）

        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(logLines('auto-resume')).toHaveLength(1);
        expect(controller.hasPlayIntent()).toBe(true);
        detach();
    });

    it(`gives up after ${REMOTE_AUTO_RESUME_MAX} automatic plays`, async () => {
        const { audio, controller, detach } = await resumed();

        for (let i = 0; i <= REMOTE_AUTO_RESUME_MAX; i += 1) {
            audio.pause();
            audio.paused = false; // auto-resume 嘅 play() 已經開始播
        }

        expect(audio.play).toHaveBeenCalledTimes(REMOTE_AUTO_RESUME_MAX);
        expect(logLines('auto-resume')).toHaveLength(REMOTE_AUTO_RESUME_MAX);
        detach();
        void controller;
    });

    it('respects a system pause that comes after the window', async () => {
        const { audio, controller, detach } = await resumed();
        vi.setSystemTime(Date.now() + REMOTE_AUTO_RESUME_WINDOW_MS + 1);

        audio.pause();

        expect(audio.play).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isPlaying).toBe(false);
        detach();
    });

    it('respects a pause the user (or AirPods) asked for', async () => {
        const { audio, controller, detach } = await resumed();

        controller.pause(); // ms:pause

        expect(audio.play).not.toHaveBeenCalled();
        expect(logLines('auto-resume')).toHaveLength(0);
        detach();
    });

    it('respects a system pause when playback was started in the app', async () => {
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const detach = controller.attach();
        await controller.load(RECORDING, { autoplay: true });
        audio.emitMetadata(DURATION);
        audio.play.mockClear();

        audio.pause(); // 例如來電

        expect(audio.play).not.toHaveBeenCalled();
        detach();
    });

    it('does not auto-resume while the app is on screen', async () => {
        const { audio, detach } = await resumed();
        setScreen('visible');

        audio.pause();

        expect(audio.play).not.toHaveBeenCalled();
        detach();
    });

    it('respects stop() (e.g. closing the player)', async () => {
        const { audio, controller, detach } = await resumed();

        controller.stop();

        expect(audio.play).not.toHaveBeenCalled();
        expect(logLines('auto-resume')).toHaveLength(0);
        detach();
    });

    // Review W1：凍結要 playing 後 FROZEN_PLAYING_MS 先成立，窗口要短過佢先唔會喺凍結時淨係 play()；
    // 就算日後放寬窗口，auto-resume 都經 recoverAndPlay 走 reload
    it('keeps the auto-resume window shorter than the frozen-playing limit', () => {
        expect(REMOTE_AUTO_RESUME_WINDOW_MS).toBeLessThan(FROZEN_PLAYING_MS);
    });

    it('treats a late pause event from a requested pause as requested (real browsers queue it)', async () => {
        const { audio, controller, detach } = await resumed();
        audio.pause.mockImplementation(() => {
            audio.paused = true;
            queueMicrotask(() => audio.dispatchEvent(new Event('pause')));
        });

        controller.pause(); // ms:pause
        await controller.resume(); // 即刻 ms:play：pause event 喺之後先到
        audio.play.mockClear();
        await Promise.resolve();

        expect(logLines('auto-resume')).toHaveLength(0);
        detach();
    });

    it('forgets a requested pause whose event was dropped by a track change', async () => {
        const { audio, controller, detach } = await resumed();
        audio.pause.mockImplementation(() => {
            audio.paused = true; // load algorithm 清走咗排隊嘅 pause event
        });
        controller.pause();
        await controller.load(
            { ...RECORDING, id: `id:${RECORDING.url}?next`, url: `${RECORDING.url}?next` },
            { autoplay: true },
        );
        audio.emitMetadata(DURATION);
        audio.pause.mockRestore();
        await controller.resume();
        audio.paused = false;
        audio.play.mockClear();

        audio.dispatchEvent(new Event('pause')); // 系統停

        expect(logLines('auto-resume')).toHaveLength(1);
        detach();
    });
});
