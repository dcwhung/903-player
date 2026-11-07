import { bannerRule, LONG_BANNER_MIN_RATIO, type BannerRule } from './bannerRules';

const rule = (
    image: BannerRule['image'],
    fit: BannerRule['fit'],
    shiftDownPx = 0,
    shiftRightPx = 0,
): BannerRule => ({ image, fit, shiftDownPx, shiftRightPx });

/** 一般格嘅闊 ÷ 高（唔會自動轉長版） */
const SQUARE = 1;

describe('bannerRule', () => {
    it.each([
        // 卡數, 冇 mini player, 有 mini player（用戶喺 prototype T7 逐個揀）
        [1, rule('standard', 'height', 0, 20), rule('standard', 'height')],
        [3, rule('long', 'width'), rule('long', 'width', 12)],
        [4, rule('long', 'height'), rule('long', 'width')],
        [5, rule('standard', 'height'), rule('long', 'height')],
        [6, rule('long', 'height'), rule('long', 'height')],
        [7, rule('standard', 'height', 0, 8), rule('standard', 'height')],
        [8, rule('standard', 'width'), rule('long', 'height')],
    ])('should use the chosen banner for %i card(s)', (count, off, on) => {
        expect(bannerRule(count, false, SQUARE)).toEqual(off);
        expect(bannerRule(count, true, SQUARE)).toEqual(on);
    });

    it.each([9, 12, 15])(
        'should treat %i cards like 8 (same banner slot in the strip)',
        (count) => {
            expect(bannerRule(count, false, SQUARE)).toEqual(rule('standard', 'width'));
            expect(bannerRule(count, true, SQUARE)).toEqual(rule('long', 'height'));
        },
    );

    it('should show the whole standard banner for 2 cards, with or without a mini player', () => {
        expect(bannerRule(2, false, SQUARE)).toEqual(rule('standard', 'contain'));
        expect(bannerRule(2, true, SQUARE)).toEqual(rule('standard', 'contain'));
    });

    it('should switch to the long banner for 2 cards once the cell is wide enough', () => {
        expect(bannerRule(2, false, LONG_BANNER_MIN_RATIO)).toEqual(rule('long', 'contain'));
        expect(bannerRule(2, true, LONG_BANNER_MIN_RATIO - 0.01)).toEqual(
            rule('standard', 'contain'),
        );
    });

    it('should fall back to the whole standard banner before the cell is measured', () => {
        expect(bannerRule(2, false, Number.NaN)).toEqual(rule('standard', 'contain'));
        expect(bannerRule(0, false, Number.NaN)).toEqual(rule('standard', 'contain'));
    });
});
