import { LANDSCAPE_LAYOUT_QUERY, LANDSCAPE_QUERY } from '../src/config/layout';
import { matchesQuery, type ViewportSize } from './mediaQuery';

/** iPad 打橫：闊橫版（WIDE_BANNER_QUERY）；轉直之後 */
const WIDE_VIEWPORT: ViewportSize = { width: 1180, height: 820 };
const ROTATED_VIEWPORT: ViewportSize = { width: 820, height: 1180 };
/** 手機打橫（SHORT_LANDSCAPE_QUERY） */
export const PHONE_SIDEWAYS_VIEWPORT: ViewportSize = { width: 844, height: 390 };

const REDUCED_MOTION = 'prefers-reduced-motion';

/**
 * 照真實 viewport 尺寸計 media query（同瀏覽器一樣），唔靠估 query 入面有冇某個字：
 * 加咗新嘅裝置 query（iPhone Duo / HomeView）都唔會誤中。尺寸以外嘅 query 只識減少動畫
 */
const matchesViewport = (query: string, viewport: ViewportSize, reducedMotion: boolean) =>
    query.includes(REDUCED_MOTION) ? reducedMotion : matchesQuery(query, viewport);

/**
 * 當畫面係某個尺寸。用完要 vi.unstubAllGlobals()
 */
export const stubViewport = (viewport: ViewportSize, { reducedMotion = false } = {}) => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: matchesViewport(query, viewport, reducedMotion),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
};

/**
 * 當畫面打橫（行橫版版面：LANDSCAPE_QUERY / LANDSCAPE_LAYOUT_QUERY 符合，其他 media query 唔符合，
 * 例如手機打橫、闊橫版、減少動畫）。用完要 vi.unstubAllGlobals()
 */
export const stubLandscape = () => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: query === LANDSCAPE_QUERY || query === LANDSCAPE_LAYOUT_QUERY,
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
export const stubWideLandscape = ({ reducedMotion = false } = {}) =>
    stubViewport(WIDE_VIEWPORT, { reducedMotion });

/**
 * 闊橫版，之後可以轉直（rotate）：所有打橫 query 變唔符合，並通知 useMediaQuery 嘅 listener。
 * 用完要 vi.unstubAllGlobals()
 */
export const stubRotatableWideLandscape = () => {
    let viewport = WIDE_VIEWPORT;
    const listeners = new Set<() => void>();
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            get matches() {
                return matchesViewport(query, viewport, false);
            },
            media: query,
            addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
            removeEventListener: (_type: string, listener: () => void) =>
                listeners.delete(listener),
        })),
    );
    return {
        rotate: () => {
            viewport = ROTATED_VIEWPORT;
            listeners.forEach((listener) => listener());
        },
    };
};
