import { scrollBehavior } from './motion';

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query })),
    );

describe('scrollBehavior', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('scrolls smoothly by default', () => {
        stubReducedMotion(false);

        expect(scrollBehavior()).toBe('smooth');
    });

    it('jumps when the user prefers reduced motion', () => {
        stubReducedMotion(true);

        expect(scrollBehavior()).toBe('auto');
    });

    it('scrolls smoothly when matchMedia is unavailable', () => {
        vi.stubGlobal('matchMedia', undefined);

        expect(scrollBehavior()).toBe('smooth');
    });
});
