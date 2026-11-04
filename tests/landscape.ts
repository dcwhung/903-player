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

/**
 * 闊橫版，之後可以轉直（rotate）：所有打橫 query 變唔符合，並通知 useMediaQuery 嘅 listener。
 * 用完要 vi.unstubAllGlobals()
 */
export const stubRotatableWideLandscape = () => {
    let landscape = true;
    const listeners = new Set<() => void>();
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            get matches() {
                return landscape && query.includes('landscape') && !query.includes('max-height');
            },
            media: query,
            addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
            removeEventListener: (_type: string, listener: () => void) =>
                listeners.delete(listener),
        })),
    );
    return {
        rotate: () => {
            landscape = false;
            listeners.forEach((listener) => listener());
        },
    };
};
