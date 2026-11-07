import { viewportGap } from './viewportGap';

const IPHONE = { standalone: true, portrait: true, screenHeight: 852, innerHeight: 797 };

describe('viewportGap', () => {
    it('measures how far the iOS standalone viewport stops above the screen bottom', () => {
        expect(viewportGap(IPHONE)).toBe(55);
    });

    it('is zero when the viewport fills the screen', () => {
        expect(viewportGap({ ...IPHONE, innerHeight: 852 })).toBe(0);
    });

    it('is zero outside standalone mode, where browser toolbars take the height', () => {
        expect(viewportGap({ ...IPHONE, standalone: false, innerHeight: 700 })).toBe(0);
    });

    it('is zero in landscape, where screen.height is still the portrait height', () => {
        expect(viewportGap({ ...IPHONE, portrait: false, innerHeight: 393 })).toBe(0);
    });

    it('allows gaps up to the cap but not beyond', () => {
        expect(viewportGap({ ...IPHONE, innerHeight: 772 })).toBe(80);
        expect(viewportGap({ ...IPHONE, innerHeight: 771 })).toBe(0);
    });

    it('ignores gaps too large to be the iOS bug (e.g. keyboard open)', () => {
        expect(viewportGap({ ...IPHONE, innerHeight: 500 })).toBe(0);
    });
});
