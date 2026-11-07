import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { zoomFromState, zoomInto, zoomKey } from '../utils/cardZoom';
import { useZoomNavigate } from './useZoomNavigate';

let zoomed = true;
// 包住 zoomInto：照行 update，話佢有冇真係開到過場
vi.mock('../utils/cardZoom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../utils/cardZoom')>()),
    zoomInto: vi.fn((_key: string, update: (z: boolean) => void) => update(zoomed)),
}));

const KEY = zoomKey.show('gongzi');

const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
);

const renderOpen = () =>
    renderHook(() => ({ open: useZoomNavigate(), location: useLocation() }), { wrapper });

describe('useZoomNavigate', () => {
    afterEach(() => {
        zoomed = true;
        vi.mocked(zoomInto).mockClear();
    });

    it('should go to the page from the tile and tie the tile to that history entry', () => {
        const { result } = renderOpen();

        act(() => result.current.open(KEY, '/show/gongzi'));

        expect(zoomInto).toHaveBeenCalledWith(KEY, expect.any(Function), 'zoom');
        expect(result.current.location.pathname).toBe('/show/gongzi');
        expect(zoomFromState(result.current.location.state)).toBe(KEY);
    });

    it('should pass on the handle-paired zoom and still tie the tile to the entry', () => {
        const { result } = renderOpen();

        act(() => result.current.open(KEY, '/show/gongzi', 'zoom-handle'));

        expect(zoomInto).toHaveBeenCalledWith(KEY, expect.any(Function), 'zoom-handle');
        expect(zoomFromState(result.current.location.state)).toBe(KEY);
    });

    it('should not remember the tile when no zoom transition ran (W-527)', () => {
        zoomed = false;
        const { result } = renderOpen();

        act(() => result.current.open(KEY, '/show/gongzi'));

        expect(result.current.location.pathname).toBe('/show/gongzi');
        expect(zoomFromState(result.current.location.state)).toBeNull();
    });
});
