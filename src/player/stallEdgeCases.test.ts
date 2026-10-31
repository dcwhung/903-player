// S-551 鎖屏卡住嘅邊界情況（QA 2026-10-29 建議）
import { FakeAudio, timeRanges } from '../../tests/fakeAudio';
import { HAVE_CURRENT_DATA } from './mediaReadyState';
import type { Recording } from '../types/recording';
import {
    STALL_FIRST_RETRY_MS,
    STALL_MAX_RETRIES,
    STALL_MAX_WAIT_MS,
    STALL_RETRY_MS,
} from '../config/constants';
import { getResumePosition, saveProgress } from '../services/progressStore';
import { AudioController } from './AudioController';
import { isLoadProgressing } from './loadProgress';
import { readPlaybackLog } from './playbackLog';
import { bufferedEnd } from '../utils/bufferedEnd';

const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/gongzi/qa.aac',
};
const DURATION = 600;
const RESUME_AT = 120;

const stalledStart = async () => {
    saveProgress(RECORDING.url, RESUME_AT, DURATION);
    const audio = new FakeAudio();
    const controller = new AudioController(audio.asAudio());
    const detach = controller.attach();
    await controller.load(RECORDING, { autoplay: true });
    audio.emitMetadata(DURATION);
    audio.emitPlaying();
    return { audio, controller, detach };
};
const retries = () => readPlaybackLog().filter((l) => l.includes(' retry '));

describe('QA S-551 edge cases', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should not retry after stop when the element was already paused (no pause event, S-640)', async () => {
        const { audio, controller, detach } = await stalledStart();
        // 真 element 已經暫停：pause() 唔會再發 pause event，onPause 收唔到
        audio.paused = true;
        controller.stop();
        audio.play.mockClear();
        audio.load.mockClear();

        vi.advanceTimersByTime(STALL_MAX_WAIT_MS);

        expect(audio.play).not.toHaveBeenCalled();
        expect(audio.load).not.toHaveBeenCalled();
        expect(controller.getSnapshot().isPlaying).toBe(false);
        detach();
    });

    it('should stop at exactly STALL_MAX_RETRIES reloads when audio never arrives, and keep reporting stalled', async () => {
        const { audio, controller, detach } = await stalledStart();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS + STALL_RETRY_MS * (STALL_MAX_RETRIES + 3));
        expect(audio.load).toHaveBeenCalledTimes(STALL_MAX_RETRIES);
        expect(retries().map((l) => l.split(' ').at(-1))).toEqual(['left=3', 'left=2', 'left=1']);
        // budget spent: still flagged stalled so the lock screen shows Play (not a fake "playing")
        expect(controller.getSnapshot().isStalled).toBe(true);
        detach();
    });

    it('should still recover via lock-screen play after the retry budget is spent', async () => {
        const { audio, controller, detach } = await stalledStart();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS + STALL_RETRY_MS * (STALL_MAX_RETRIES + 1));
        audio.load.mockClear();
        await controller.resume();
        expect(audio.load).toHaveBeenCalledTimes(1);
        expect(retries().at(-1)).toMatch(/ remote$/);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        expect(audio.load).toHaveBeenCalledTimes(2);
        expect(retries().at(-1)).toMatch(new RegExp(` left=${STALL_MAX_RETRIES}$`));
        detach();
    });

    it('should resume from the lock-screen seek target when a seek happens while stalled', async () => {
        const SEEK_TO = 300;
        const { audio, controller, detach } = await stalledStart();
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        expect(controller.getSnapshot().isStalled).toBe(true);
        audio.emitMetadata(DURATION);
        controller.seek(SEEK_TO);
        audio.load.mockClear();
        vi.advanceTimersByTime(STALL_RETRY_MS);
        expect(audio.load).toHaveBeenCalledTimes(1);
        audio.emitMetadata(DURATION);
        expect(audio.currentTime).toBe(SEEK_TO);
        detach();
    });

    it('should never overwrite saved progress with 0 across all stalled retries', async () => {
        const { audio, controller, detach } = await stalledStart();
        const screen = vi.spyOn(document, 'visibilityState', 'get');
        for (let i = 0; i < STALL_MAX_RETRIES; i += 1) {
            // 前景先會 reload；reload 將 currentTime reset 做 0，metadata 未到就切走都唔可以存 0（S-620）
            screen.mockReturnValue('visible');
            vi.advanceTimersByTime(STALL_RETRY_MS);
            screen.mockReturnValue('hidden');
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('pagehide'));
        }
        expect(audio.load).toHaveBeenCalledTimes(STALL_MAX_RETRIES);
        expect(getResumePosition(RECORDING.url)).toBe(RESUME_AT);
        expect(controller.getSnapshot().currentTime).toBe(RESUME_AT);
        detach();
    });

    it('should hit the 30 s cap and then retry every STALL_RETRY_MS even if data keeps trickling in', async () => {
        const { audio, detach } = await stalledStart();
        let end = RESUME_AT;
        const grow = () => {
            end += 0.1;
            audio.buffered = timeRanges([[RESUME_AT, end]]);
        };
        const STEP = 1000;
        for (let t = 0; t + STEP < STALL_MAX_WAIT_MS; t += STEP) {
            grow();
            vi.advanceTimersByTime(STEP);
        }
        vi.advanceTimersByTime(STEP - 1); // 29 999 ms
        expect(audio.load).not.toHaveBeenCalled();
        grow();
        vi.advanceTimersByTime(1);
        expect(audio.load).toHaveBeenCalledTimes(1);
        detach();
    });

    it('should not treat a readyState drop or a buffered gap at the playhead as progress', () => {
        const base = {
            bufferedEnd: 130,
            readyState: 4,
            currentTime: 120,
            playingFired: false,
            progressEvents: 0,
        };
        expect(isLoadProgressing(base, { ...base, readyState: HAVE_CURRENT_DATA })).toBe(false);
        expect(isLoadProgressing(base, { ...base, bufferedEnd: undefined })).toBe(false);
        const gap = {
            currentTime: 50,
            buffered: timeRanges([
                [0, 40],
                [60, 90],
            ]),
        } as unknown as HTMLMediaElement;
        expect(bufferedEnd(gap)).toBeUndefined();
    });
});
