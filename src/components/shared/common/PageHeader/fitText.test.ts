import { applyFit, fitFontSize } from './fitText';

const BASE = { basePx: 24, minPx: 14 };

describe('fitFontSize', () => {
    it('should keep the base size when the text fits', () => {
        expect(fitFontSize({ ...BASE, availablePx: 200, neededPx: 192 })).toBe(24);
    });

    it('should scale down in proportion, rounded down to a half pixel', () => {
        // 8 個中文字 24px = 192px，格得 179px → 22.375 → 22
        expect(fitFontSize({ ...BASE, availablePx: 179, neededPx: 192 })).toBe(22);
        expect(fitFontSize({ ...BASE, availablePx: 180, neededPx: 192 })).toBe(22.5);
    });

    it('should not go below the minimum size', () => {
        expect(fitFontSize({ ...BASE, availablePx: 50, neededPx: 192 })).toBe(14);
    });

    it('should keep the base size when nothing has been laid out yet', () => {
        expect(fitFontSize({ ...BASE, availablePx: 0, neededPx: 0 })).toBe(24);
    });
});

describe('applyFit', () => {
    const BASE_FONT = '24px';
    const CHARS = 8;
    const AVAILABLE_PX = 179;

    /** 假標題格：clientWidth 固定，文字闊度跟住 inline 字體大小變（預設每字 1em） */
    const setup = (widthAt: (sizePx: number) => number = (size) => CHARS * size) => {
        const el = document.createElement('h1');
        const content = document.createElement('span');
        el.append(content);
        const size = () => parseFloat(el.style.fontSize || BASE_FONT);
        Object.defineProperty(el, 'clientWidth', { get: () => AVAILABLE_PX });
        Object.defineProperty(content, 'scrollWidth', { get: () => widthAt(size()) });
        return { el, content };
    };

    const stubCssFontSize = (fontSize: string) =>
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize } as CSSStyleDeclaration);

    beforeEach(() => {
        stubCssFontSize(BASE_FONT);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should clear an old size and keep the CSS size when the text fits', () => {
        const { el, content } = setup((size) => (CHARS - 1) * size);
        el.style.fontSize = '18px';
        applyFit(el, content, BASE.minPx);
        expect(el.style.fontSize).toBe('');
    });

    it('should set the proportionally scaled size when the text is too wide', () => {
        // 24px 要 192px，格得 179px → 22px
        const { el, content } = setup();
        applyFit(el, content, BASE.minPx);
        expect(el.style.fontSize).toBe('22px');
    });

    it('should step down further when rounding still leaves the text too wide', () => {
        // 按比例縮到 21px；20.5px 或以上都量到 200px（例如字距捨入），要逐步縮到 20px 先放得落
        const { el, content } = setup((size) => (size >= 20.5 ? 200 : CHARS * size));
        applyFit(el, content, BASE.minPx);
        expect(el.style.fontSize).toBe('20px');
    });

    it('should not step below the minimum size', () => {
        const minPx = 20;
        const { el, content } = setup((size) => CHARS * 2 * size);
        applyFit(el, content, minPx);
        expect(el.style.fontSize).toBe('20px');
    });

    it('should leave the size alone when the CSS size cannot be read', () => {
        stubCssFontSize('');
        const { el, content } = setup();
        applyFit(el, content, BASE.minPx);
        expect(el.style.fontSize).toBe('');
    });
});
