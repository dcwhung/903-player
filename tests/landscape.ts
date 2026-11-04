import { LANDSCAPE_QUERY } from '../src/config/layout';

/**
 * 當畫面打橫（LANDSCAPE_QUERY 符合，其他 media query 唔符合，例如手機打橫、減少動畫）。
 * 用完要 vi.unstubAllGlobals()
 */
export const stubLandscape = () => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: query === LANDSCAPE_QUERY,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
};

/**
 * 闊橫版（WIDE_BANNER_QUERY：打橫、≥ 640 闊、≥ 562 高）。
 * 手機打橫（max-height: 561px）同減少動畫唔符合；reducedMotion 就連減少動畫都符合。
 * 用完要 vi.unstubAllGlobals()
 */
export const stubWideLandscape = ({ reducedMotion = false } = {}) => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches:
                (query.includes('landscape') && !query.includes('max-height')) ||
                (reducedMotion && query.includes('prefers-reduced-motion')),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
};
