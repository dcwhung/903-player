import { FakeAudio } from '../../tests/fakeAudio';
import type { Recording } from '../types/recording';
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
