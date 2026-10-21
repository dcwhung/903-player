import { MARQUEE_SPEED_PX_PER_S, MARQUEE_TRAVEL_SHARE, marqueeDurationMs } from './marquee';

describe('marqueeDurationMs', () => {
    it('scrolls at a constant speed, leaving the rest of the cycle for pauses at each end', () => {
        const overflowPx = 60;
        const travelMs = (overflowPx / MARQUEE_SPEED_PX_PER_S) * 1000;

        expect(marqueeDurationMs(overflowPx)).toBe(Math.round(travelMs / MARQUEE_TRAVEL_SHARE));
    });

    it('takes longer for longer text', () => {
        expect(marqueeDurationMs(120)).toBeGreaterThan(marqueeDurationMs(30));
    });
});
