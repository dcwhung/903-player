import {
    MARQUEE_GAP_PX,
    MARQUEE_SPEED_PX_PER_S,
    marqueeDistancePx,
    marqueeDurationMs,
} from './marquee';

describe('marquee', () => {
    it('moves one full copy plus the gap per loop, so the next copy lands where the first started', () => {
        expect(marqueeDistancePx(180)).toBe(180 + MARQUEE_GAP_PX);
    });

    it('scrolls at a constant speed', () => {
        const distancePx = 212;

        expect(marqueeDurationMs(distancePx)).toBe(
            Math.round((distancePx / MARQUEE_SPEED_PX_PER_S) * 1000),
        );
        expect(marqueeDurationMs(300)).toBeGreaterThan(marqueeDurationMs(100));
    });
});
