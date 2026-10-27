import { centredScrollLeft, nearestScrollTop, peekScrollTop } from './scroll';

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

describe('peekScrollTop', () => {
    const view = { top: 100, height: 300, scrollTop: 40 };

    it('should bring the row to the top of the panel, leaving the peek of the row above', () => {
        // 行喺 panel 頂下面 120px（scrollTop 40）→ 捲到 40 + 120 − 30
        expect(peekScrollTop(view, { top: 220, height: 60 }, 30)).toBe(130);
    });

    it('should never scroll above the top of the list', () => {
        expect(peekScrollTop({ ...view, scrollTop: 0 }, { top: 110, height: 60 }, 30)).toBe(0);
    });
});

describe('centredScrollLeft', () => {
    it('scrolls so the chip sits in the middle of the panel', () => {
        // panel 300 闊、已捲 40；chip 喺可見範圍 250 起、60 闊 → 中心要喺 150：40 + 250 − 120 = 170
        expect(centredScrollLeft({ scrollLeft: 40, width: 300 }, { left: 250, width: 60 })).toBe(
            170,
        );
    });

    it('scrolls back left for a chip left of the visible range', () => {
        expect(centredScrollLeft({ scrollLeft: 400, width: 300 }, { left: -200, width: 60 })).toBe(
            80,
        );
    });
});
