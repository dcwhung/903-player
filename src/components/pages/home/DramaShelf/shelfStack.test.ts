import { stackLayout } from './shelfStack';

/*
 * 直版疊卡書架（T8）：iPhone 430px 闊，扣走左右留白 → 卡闊 398px，最矮 2:1 = 199px，最高 × 0.6 ≈ 238.8px。
 * 書架高（扣走上下留白）：冇 mini player 634px，有 mini player 534px（同 Playwright 430×877 量到嘅一樣）
 */
const PHONE = { widthPx: 398, gapPx: 12, minRatio: 0.5, maxRatio: 0.6, minStepPx: 72 };
const TALL_PX = 634;
const SHORT_PX = 534;

describe('stackLayout', () => {
    it('should give 2 dramas their tallest cards without overlap, the rest left at the bottom', () => {
        const layout = stackLayout({ ...PHONE, count: 2, heightPx: TALL_PX });

        expect(layout?.cardPx).toBeCloseTo(398 * 0.6);
        expect(layout?.stepPx).toBeCloseTo(398 * 0.6 + 12);
        expect(layout?.scrolls).toBe(false);
    });

    it('should share the height out between 3 dramas when they fit without overlap', () => {
        // 3 × 199 + 2 × 12 = 621 ≤ 634：(634 − 24) ÷ 3 ≈ 203.3
        const layout = stackLayout({ ...PHONE, count: 3, heightPx: TALL_PX });

        expect(layout?.cardPx).toBeCloseTo(610 / 3);
        expect(layout?.stepPx).toBeCloseTo(610 / 3 + 12);
        expect(layout?.scrolls).toBe(false);
    });

    it.each([
        [3, SHORT_PX, (534 - 199) / 2],
        [4, TALL_PX, (634 - 199) / 3],
        [4, SHORT_PX, (534 - 199) / 3],
        [7, TALL_PX, (634 - 199) / 6],
    ])(
        'should overlap %i dramas in %ipx so the last card reaches the bottom',
        (count, heightPx, stepPx) => {
            const layout = stackLayout({ ...PHONE, count, heightPx });

            expect(layout?.cardPx).toBe(199);
            expect(layout?.stepPx).toBeCloseTo(stepPx);
            expect(layout?.scrolls).toBe(false);
            // 最後一張卡底剛好到書架底
            expect((count - 1) * (layout?.stepPx ?? 0) + 199).toBeCloseTo(heightPx);
        },
    );

    it.each([
        [7, SHORT_PX],
        [10, TALL_PX],
    ])('should fall back to a 72px step and scroll %i dramas in %ipx', (count, heightPx) => {
        expect(stackLayout({ ...PHONE, count, heightPx })).toEqual({
            cardPx: 199,
            stepPx: 72,
            scrolls: true,
        });
    });

    it('should scroll a single card taller than the shelf', () => {
        expect(stackLayout({ ...PHONE, count: 1, heightPx: 150 })?.scrolls).toBe(true);
    });

    it('should wait until the shelf has been measured', () => {
        expect(stackLayout({ ...PHONE, widthPx: 0, count: 4, heightPx: 0 })).toBeUndefined();
    });
});
