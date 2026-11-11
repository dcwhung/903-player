import { durationMs, flipOffset } from './flip';

const box = (left: number, top: number, width = 36, height = 36) => ({ left, top, width, height });

describe('flipOffset', () => {
    it('should move an element back to where it was before the layout change', () => {
        expect(flipOffset(box(180, 700), box(20, 740))).toEqual({ dx: 160, dy: -40 });
    });

    it('should skip elements that were hidden before or after (zero size) or did not move', () => {
        expect(flipOffset(box(0, 0, 0, 0), box(20, 740))).toBeNull();
        expect(flipOffset(box(20, 740), box(20, 740))).toBeNull();
    });
});

describe('durationMs', () => {
    it('should read the --motion-move token in ms or s (the build minifies 220ms to .22s)', () => {
        expect(durationMs('220ms')).toBe(220);
        expect(durationMs(' .22s')).toBe(220);
        expect(durationMs('')).toBeUndefined();
        expect(durationMs('fast')).toBeUndefined();
    });
});
