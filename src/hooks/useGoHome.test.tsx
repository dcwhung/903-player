import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { unzoomHome, zoomKey, zoomState } from '../utils/cardZoom';
import { withViewTransition } from '../utils/viewTransition';
import { useGoHome } from './useGoHome';

vi.mock('../utils/cardZoom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../utils/cardZoom')>()),
    unzoomHome: vi.fn((_: string | null, go: () => void) => go()),
}));
vi.mock('../utils/viewTransition', () => ({
    withViewTransition: vi.fn((go: () => void) => {
        go();
        return true;
    }),
}));

const KEY = zoomKey.show('gongzi');
const SHOW_PATH = '/show/gongzi';

const stubWide = (wide: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: wide && query.includes('min-height: 562px'),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );

const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
);

const renderGoHome = () =>
    renderHook(
        () => ({ goHome: useGoHome(), navigate: useNavigate(), path: useLocation().pathname }),
        { wrapper },
    );

/** 撳格仔 zoom 入節目頁：入頁嗰個 history entry 帶住來源 */
const zoomIn = (result: { current: ReturnType<typeof renderGoHome>['result']['current'] }) =>
    act(() => void result.current.navigate(SHOW_PATH, { state: zoomState(KEY) }));

describe('useGoHome', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.mocked(unzoomHome).mockClear();
        vi.mocked(withViewTransition).mockClear();
    });

    it('should shrink back into the tile the page was zoomed from on a narrow screen', () => {
        stubWide(false);
        const { result } = renderGoHome();
        zoomIn(result);

        act(() => result.current.goHome());

        expect(unzoomHome).toHaveBeenCalledWith(KEY, expect.any(Function));
        expect(withViewTransition).not.toHaveBeenCalled();
        expect(result.current.path).toBe('/');
    });

    it('should just go home when the page was opened another way (W-527)', () => {
        stubWide(false);
        const { result } = renderGoHome();
        zoomIn(result);
        // 系統返回手勢返主頁，再撳 mini player 入同一頁（冇 zoom 來源）
        act(() => void result.current.navigate(-1));
        act(() => void result.current.navigate(SHOW_PATH));

        act(() => result.current.goHome());

        expect(unzoomHome).toHaveBeenCalledExactlyOnceWith(null, expect.any(Function));
        expect(result.current.path).toBe('/');
    });

    it('should keep the back transition on a wide screen', () => {
        stubWide(true);
        const { result } = renderGoHome();
        zoomIn(result);

        act(() => result.current.goHome());

        expect(withViewTransition).toHaveBeenCalledWith(expect.any(Function), 'back');
        expect(unzoomHome).not.toHaveBeenCalled();
        expect(result.current.path).toBe('/');
    });
});
