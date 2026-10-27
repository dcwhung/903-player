import {
    DISMISS_RATIO,
    REVEAL_MIN_PX,
    REVEAL_PX,
    dismissOffset,
    dismissOutcome,
} from './miniPlayerDismiss';

const WIDTH = 360;

describe('dismissOffset', () => {
    it('should follow a leftward drag from where the card was', () => {
        expect(dismissOffset(0, -60, WIDTH)).toBe(60);
        expect(dismissOffset(REVEAL_PX, -20, WIDTH)).toBe(REVEAL_PX + 20);
    });

    it('should close the gap again when dragged back to the right', () => {
        expect(dismissOffset(REVEAL_PX, 30, WIDTH)).toBe(REVEAL_PX - 30);
    });

    it('should not move the card right of its resting place nor past its own width', () => {
        expect(dismissOffset(0, 50, WIDTH)).toBe(0);
        expect(dismissOffset(0, -WIDTH * 2, WIDTH)).toBe(WIDTH);
    });
});

describe('dismissOutcome', () => {
    it('should close once dragged past half the card width', () => {
        expect(dismissOutcome(WIDTH * DISMISS_RATIO, WIDTH)).toBe('dismiss');
    });

    it('should stay open on the close button after a partial drag', () => {
        expect(dismissOutcome(REVEAL_MIN_PX, WIDTH)).toBe('reveal');
        expect(dismissOutcome(WIDTH * DISMISS_RATIO - 1, WIDTH)).toBe('reveal');
    });

    it('should fold back after a tiny drag', () => {
        expect(dismissOutcome(REVEAL_MIN_PX - 1, WIDTH)).toBe('collapse');
        expect(dismissOutcome(0, WIDTH)).toBe('collapse');
    });

    it('should never close a card that has no width yet', () => {
        expect(dismissOutcome(REVEAL_MIN_PX, 0)).toBe('reveal');
    });
});
