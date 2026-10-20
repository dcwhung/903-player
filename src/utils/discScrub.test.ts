import { angleDelta, arcFollowDegrees, clampTurn, pointerAngle, turnSeconds } from './discScrub';

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

describe('clampTurn', () => {
    const range = { startSeconds: 100, max: 400, secondsPerTurn: SECONDS_PER_TURN };

    it('passes turns that stay inside the recording', () => {
        expect(clampTurn(180, range)).toBe(180);
    });

    it('stops at the start and the end of the recording', () => {
        expect(clampTurn(-1000, range)).toBe(-600);
        expect(clampTurn(5000, range)).toBe(1800);
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
