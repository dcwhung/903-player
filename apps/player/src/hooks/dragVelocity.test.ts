import { VELOCITY_WINDOW_MS, pushSample, velocityOf } from './dragVelocity';

describe('velocityOf', () => {
    it('should measure the speed over the recent samples', () => {
        let samples = pushSample([], { x: 0, t: 0 });
        samples = pushSample(samples, { x: -30, t: 20 });
        samples = pushSample(samples, { x: -60, t: 40 });

        expect(velocityOf(samples)).toBeCloseTo(-1.5);
    });

    it('should forget samples older than the window, so a pause before release is slow', () => {
        let samples = pushSample([], { x: 0, t: 0 });
        samples = pushSample(samples, { x: -100, t: 20 });
        samples = pushSample(samples, { x: -100, t: 20 + VELOCITY_WINDOW_MS + 1 });

        expect(velocityOf(samples)).toBe(0);
    });

    it('should be zero without elapsed time', () => {
        expect(velocityOf(pushSample([], { x: 5, t: 0 }))).toBe(0);
    });
});
