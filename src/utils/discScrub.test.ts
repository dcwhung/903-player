import {
    DISC_SCRUB_FAST_DEGREES_PER_MS,
    DISC_SCRUB_MAX_SECONDS_PER_TURN,
    DISC_SCRUB_MIN_SECONDS_PER_TURN,
    DISC_SCRUB_SLOW_DEGREES_PER_MS,
} from '../config/constants';
import {
    angleDelta,
    arcFollowDegrees,
    pointerAngle,
    scrubSecondsPerTurn,
    scrubStep,
    turnSeconds,
} from './discScrub';

const SECONDS_PER_TURN = 60;

describe('pointerAngle', () => {
    it('measures clockwise from the right in screen coordinates', () => {
        expect(pointerAngle(10, 0, 0, 0)).toBeCloseTo(0);
        expect(pointerAngle(0, 10, 0, 0)).toBeCloseTo(90);
        expect(pointerAngle(-10, 0, 0, 0)).toBeCloseTo(180);
    });
});

describe('angleDelta', () => {
    it('returns the short signed turn between two angles', () => {
        expect(angleDelta(10, 30)).toBe(20);
        expect(angleDelta(30, 10)).toBe(-20);
    });

    it('wraps across ±180° without jumping a full turn', () => {
        expect(angleDelta(170, -170)).toBe(20);
        expect(angleDelta(-170, 170)).toBe(-20);
    });
});

describe('turnSeconds', () => {
    it('maps a full clockwise turn to the configured seconds', () => {
        expect(turnSeconds(360, SECONDS_PER_TURN)).toBe(60);
        expect(turnSeconds(-90, SECONDS_PER_TURN)).toBe(-15);
    });
});

describe('scrubSecondsPerTurn', () => {
    it('uses the fine rate for slow turns', () => {
        expect(scrubSecondsPerTurn(0)).toBe(DISC_SCRUB_MIN_SECONDS_PER_TURN);
        expect(scrubSecondsPerTurn(DISC_SCRUB_SLOW_DEGREES_PER_MS)).toBe(
            DISC_SCRUB_MIN_SECONDS_PER_TURN,
        );
    });

    it('caps at the coarse rate for fast flicks', () => {
        expect(scrubSecondsPerTurn(DISC_SCRUB_FAST_DEGREES_PER_MS)).toBe(
            DISC_SCRUB_MAX_SECONDS_PER_TURN,
        );
        expect(scrubSecondsPerTurn(DISC_SCRUB_FAST_DEGREES_PER_MS * 10)).toBe(
            DISC_SCRUB_MAX_SECONDS_PER_TURN,
        );
    });

    it('speeds up linearly in between', () => {
        const midSpeed = (DISC_SCRUB_SLOW_DEGREES_PER_MS + DISC_SCRUB_FAST_DEGREES_PER_MS) / 2;
        expect(scrubSecondsPerTurn(midSpeed)).toBeCloseTo(
            (DISC_SCRUB_MIN_SECONDS_PER_TURN + DISC_SCRUB_MAX_SECONDS_PER_TURN) / 2,
        );
    });
});

describe('scrubStep', () => {
    const max = 400;

    it('moves by the turned angle at the given rate', () => {
        expect(scrubStep(100, 90, SECONDS_PER_TURN, max)).toEqual({ seconds: 115, degrees: 90 });
        expect(scrubStep(100, -90, SECONDS_PER_TURN, max)).toEqual({ seconds: 85, degrees: -90 });
    });

    it('stops at the start and the end, turning the disc only as far as it moved', () => {
        expect(scrubStep(10, -360, SECONDS_PER_TURN, max)).toEqual({ seconds: 0, degrees: -60 });
        expect(scrubStep(390, 360, SECONDS_PER_TURN, max)).toEqual({ seconds: 400, degrees: 60 });
    });
});

describe('arcFollowDegrees', () => {
    it('turns the disc by the swept arc angle', () => {
        expect(arcFollowDegrees(500, 1000)).toBe(135);
        expect(arcFollowDegrees(-250, 1000)).toBe(-67.5);
    });

    it('does not turn while the duration is unknown', () => {
        expect(arcFollowDegrees(100, 0)).toBe(0);
    });
});
