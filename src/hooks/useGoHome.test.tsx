import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { unzoomHome } from '../utils/cardZoom';
import { withViewTransition } from '../utils/viewTransition';
import { useGoHome } from './useGoHome';

vi.mock('../utils/cardZoom', () => ({ unzoomHome: vi.fn((_: string, go: () => void) => go()) }));
vi.mock('../utils/viewTransition', () => ({
    withViewTransition: vi.fn((go: () => void) => {
        go();
        return true;
    }),
}));

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
    <MemoryRouter initialEntries={['/show/gongzi']}>{children}</MemoryRouter>
);

const renderGoHome = () =>
    renderHook(() => ({ goHome: useGoHome(), path: useLocation().pathname }), { wrapper });

describe('useGoHome', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.mocked(unzoomHome).mockClear();
        vi.mocked(withViewTransition).mockClear();
    });

    it('should shrink back into the tile on a narrow screen (unzoom)', () => {
        stubWide(false);
        const { result, rerender } = renderGoHome();

        result.current.goHome();
        rerender();

        expect(unzoomHome).toHaveBeenCalledWith('/show/gongzi', expect.any(Function));
        expect(withViewTransition).not.toHaveBeenCalled();
        expect(result.current.path).toBe('/');
    });

    it('should keep the back transition on a wide screen', () => {
        stubWide(true);
        const { result, rerender } = renderGoHome();

        result.current.goHome();
        rerender();

        expect(withViewTransition).toHaveBeenCalledWith(expect.any(Function), 'back');
        expect(unzoomHome).not.toHaveBeenCalled();
        expect(result.current.path).toBe('/');
    });
});
