import {
    cardIndexAtY,
    focusIndexAt,
    sameShelfLayout,
    snapTop,
    tailPadding,
    tapAction,
    type ShelfMetrics,
} from './shelfFocus';

/** 每張卡隔 112px、書架頂留 8px、focus 卡上面露 24px 上一張 */
const METRICS: ShelfMetrics = { stepPx: 112, topPx: 8, peekPx: 24 };

describe('snapTop', () => {
    it('should pin the first card to the top of the shelf, with no peek above it', () => {
        expect(snapTop(0, METRICS)).toBe(0);
    });

    it('should leave a peek of the previous card above every later card', () => {
        // 第 n 張頂 = n × 112 + 8；捲到佢上面仲有 24px
        expect(snapTop(1, METRICS)).toBe(96);
        expect(snapTop(2, METRICS)).toBe(208);
        expect(snapTop(3, METRICS)).toBe(320);
    });
});

describe('focusIndexAt', () => {
    it('should focus the card sitting at the snap position', () => {
        expect(focusIndexAt(0, 4, METRICS)).toBe(0);
        expect(focusIndexAt(96, 4, METRICS)).toBe(1);
        expect(focusIndexAt(208, 4, METRICS)).toBe(2);
    });

    it('should round to the nearest card while scrolling between two', () => {
        expect(focusIndexAt(96 + 55, 4, METRICS)).toBe(1);
        expect(focusIndexAt(96 + 57, 4, METRICS)).toBe(2);
    });

    it('should stay within the cards, even when overscrolled', () => {
        expect(focusIndexAt(-40, 4, METRICS)).toBe(0);
        expect(focusIndexAt(5000, 4, METRICS)).toBe(3);
    });

    it('should focus the first card before the shelf is measured', () => {
        expect(focusIndexAt(120, 4, { stepPx: 0, topPx: 0, peekPx: 0 })).toBe(0);
    });
});

describe('tailPadding', () => {
    it('should leave room below so the last card can scroll up to the snap position', () => {
        // 可見 500px：最尾一張停喺 24px 位，下面仲要 500 − 112 − 24 = 364px 先捲得到
        expect(tailPadding(500, METRICS)).toBe(364);
    });

    it('should never be negative on a very short shelf', () => {
        expect(tailPadding(100, METRICS)).toBe(0);
    });
});

describe('tapAction', () => {
    it('should open the card that was already focused when tapped', () => {
        expect(tapAction({ index: 2, focusAtPress: 2, keyboard: false })).toBe('open');
    });

    it('should only bring a dimmed card into focus when tapped', () => {
        expect(tapAction({ index: 2, focusAtPress: 0, keyboard: false })).toBe('focus');
    });

    it('should always open from the keyboard or a screen reader', () => {
        // 鍵盤 Tab 過去已經捲咗做 focus；讀屏 double-tap 唔使撳兩次
        expect(tapAction({ index: 2, focusAtPress: 0, keyboard: true })).toBe('open');
    });
});

// S-496：ResizeObserver 連續觸發（iOS 工具列伸縮、改 inline padding）量返一樣就唔 set 新 object
describe('sameShelfLayout', () => {
    const LAYOUT: ShelfMetrics & { cardPx: number; scrolls: boolean; tailPx?: number } = {
        ...METRICS,
        cardPx: 199,
        scrolls: true,
        tailPx: 304,
    };

    it('should treat a re-measured layout with the same numbers as unchanged', () => {
        expect(sameShelfLayout(LAYOUT, { ...LAYOUT })).toBe(true);
        expect(sameShelfLayout(undefined, undefined)).toBe(true);
    });

    it('should see any changed number, or a layout appearing / going away', () => {
        expect(sameShelfLayout(LAYOUT, { ...LAYOUT, stepPx: 145 })).toBe(false);
        expect(sameShelfLayout(LAYOUT, { ...LAYOUT, scrolls: false, tailPx: undefined })).toBe(
            false,
        );
        expect(sameShelfLayout(undefined, LAYOUT)).toBe(false);
        expect(sameShelfLayout(LAYOUT, undefined)).toBe(false);
    });
});

describe('cardIndexAtY', () => {
    // 卡頂 = 8 + n × 112：8、120、232、344（每張卡高過一行，下一張蓋住上一張下半）
    it.each([
        [8, 0],
        [119, 0],
        [120, 1],
        [231, 1],
        [232, 2],
        [344, 3],
    ])('should give the card whose top is the last one at or above y = %i', (y, index) => {
        expect(cardIndexAtY(y, 4, METRICS)).toBe(index);
    });

    it('should keep the first card above the first card top (top padding)', () => {
        expect(cardIndexAtY(0, 4, METRICS)).toBe(0);
        expect(cardIndexAtY(-50, 4, METRICS)).toBe(0);
    });

    it('should keep the last card below the last card top, however far down', () => {
        expect(cardIndexAtY(500, 4, METRICS)).toBe(3);
        expect(cardIndexAtY(10_000, 4, METRICS)).toBe(3);
    });

    it('should only ever give the first card with a single card', () => {
        expect(cardIndexAtY(300, 1, METRICS)).toBe(0);
    });

    it('should fall back to the first card before the shelf is measured', () => {
        expect(cardIndexAtY(300, 4, { ...METRICS, stepPx: 0 })).toBe(0);
        expect(cardIndexAtY(300, 0, METRICS)).toBe(0);
    });
});
