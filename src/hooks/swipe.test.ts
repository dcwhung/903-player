import { arrowKeyDirection, swipeDirection } from './swipe';

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
