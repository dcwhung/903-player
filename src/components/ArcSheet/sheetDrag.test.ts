import {
    SHEET_DISMISS_RATIO,
    SHEET_FLICK_MIN_PX,
    SHEET_FLICK_VELOCITY_PX_PER_MS,
    sheetOffset,
    shouldDismissSheet,
} from './sheetDrag';

const HEIGHT = 400;

describe('sheetOffset', () => {
    it('should follow the finger downwards', () => {
        expect(sheetOffset(120, 200)).toBe(80);
    });

    it('should not lift the sheet above its resting place', () => {
        expect(sheetOffset(200, 120)).toBe(0);
    });
});

describe('shouldDismissSheet', () => {
    it('should close once pulled past the dismiss ratio of the sheet height', () => {
        const offset = HEIGHT * SHEET_DISMISS_RATIO;
        expect(shouldDismissSheet({ offset, height: HEIGHT, velocity: 0 })).toBe(true);
    });

    it('should spring back when pulled less than the dismiss ratio slowly', () => {
        const offset = HEIGHT * SHEET_DISMISS_RATIO - 1;
        expect(shouldDismissSheet({ offset, height: HEIGHT, velocity: 0 })).toBe(false);
    });

    it('should close on a quick downward flick even when short', () => {
        expect(
            shouldDismissSheet({
                offset: SHEET_FLICK_MIN_PX,
                height: HEIGHT,
                velocity: SHEET_FLICK_VELOCITY_PX_PER_MS,
            }),
        ).toBe(true);
    });

    it('should ignore a flick that barely moved the sheet (a tap with jitter)', () => {
        expect(
            shouldDismissSheet({
                offset: SHEET_FLICK_MIN_PX - 1,
                height: HEIGHT,
                velocity: SHEET_FLICK_VELOCITY_PX_PER_MS * 2,
            }),
        ).toBe(false);
    });

    it('should not close on an upward flick at the end of the pull', () => {
        expect(
            shouldDismissSheet({
                offset: SHEET_FLICK_MIN_PX * 2,
                height: HEIGHT,
                velocity: -SHEET_FLICK_VELOCITY_PX_PER_MS * 2,
            }),
        ).toBe(false);
    });

    it('should not close when the sheet has no height yet and was not pulled', () => {
        expect(shouldDismissSheet({ offset: 0, height: 0, velocity: 0 })).toBe(false);
    });
});
