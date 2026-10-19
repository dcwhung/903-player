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
