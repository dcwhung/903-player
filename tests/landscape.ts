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
