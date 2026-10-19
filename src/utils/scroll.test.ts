import { nearestScrollTop } from './scroll';

const VIEW = { top: 100, height: 200, scrollTop: 300 };

describe('nearestScrollTop', () => {
    it('keeps the scroll position when the row is already fully visible', () => {
        expect(nearestScrollTop(VIEW, { top: 150, height: 56 })).toBe(300);
    });

    it('scrolls up just enough when the row is above the panel', () => {
        expect(nearestScrollTop(VIEW, { top: 60, height: 56 })).toBe(260);
    });

    it('scrolls down just enough when the row is below the panel', () => {
        // 行底 = 290 + 56 = 346，panel 底 = 300 → 要多捲 46
        expect(nearestScrollTop(VIEW, { top: 290, height: 56 })).toBe(346);
    });
});
