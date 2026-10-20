import { arrowKeyDirection, dragIntent, DRAG_INTENT_PX, swipeDirection, wrapIndex } from './swipe';

describe('dragIntent', () => {
    it('should wait until the pointer has moved far enough', () => {
        expect(dragIntent(DRAG_INTENT_PX - 1, 0)).toBeNull();
    });

    it('should tell horizontal from vertical movement', () => {
        expect(dragIntent(-DRAG_INTENT_PX, 2)).toBe('horizontal');
        expect(dragIntent(4, DRAG_INTENT_PX + 2)).toBe('vertical');
    });
});

describe('swipeDirection', () => {
    it('detects a left swipe as next and a right swipe as previous', () => {
        expect(swipeDirection(-80, 5)).toBe('next');
        expect(swipeDirection(80, -5)).toBe('previous');
    });

    it('ignores short or mostly vertical movement', () => {
        expect(swipeDirection(-20, 0)).toBeNull();
        expect(swipeDirection(-80, 120)).toBeNull();
    });
});

describe('arrowKeyDirection', () => {
    it('maps the right arrow to next and the left arrow to previous, like the swipes', () => {
        expect(arrowKeyDirection('ArrowRight')).toBe('next');
        expect(arrowKeyDirection('ArrowLeft')).toBe('previous');
        expect(arrowKeyDirection('ArrowDown')).toBeNull();
        expect(arrowKeyDirection('Enter')).toBeNull();
    });
});

describe('wrapIndex', () => {
    it('should step forward and back', () => {
        expect(wrapIndex(1, 3, 'next')).toBe(2);
        expect(wrapIndex(1, 3, 'previous')).toBe(0);
    });

    it('should wrap around at both ends', () => {
        expect(wrapIndex(2, 3, 'next')).toBe(0);
        expect(wrapIndex(0, 3, 'previous')).toBe(2);
    });

    it('should stay put with one show or none', () => {
        expect(wrapIndex(0, 1, 'next')).toBe(0);
        expect(wrapIndex(0, 0, 'previous')).toBe(0);
    });
});
