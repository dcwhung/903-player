import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { focusIdFromState, useEpisodeFocus } from './useEpisodeFocus';

const withState =
    (state: unknown) =>
    ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[{ pathname: '/show/gongzi', state }]}>
            {children}
        </MemoryRouter>
    );

describe('useEpisodeFocus', () => {
    it('should read focusId only when it is a string', () => {
        expect(focusIdFromState({ focusId: 'gongzi:2026-10-03' })).toBe('gongzi:2026-10-03');
        expect(focusIdFromState({ focusId: 3 })).toBeUndefined();
        expect(focusIdFromState(null)).toBeUndefined();
        // 升級前嘅 history state（focusUrl）唔再認
        expect(focusIdFromState({ focusUrl: 'a.aac' })).toBeUndefined();
    });

    it('should keep the focused episode but clear it from history, keeping the zoom source', () => {
        const { result } = renderHook(
            () => ({ focus: useEpisodeFocus(), state: useLocation().state as unknown }),
            {
                wrapper: withState({
                    focusId: 'gongzi:2026-10-03',
                    zoomFrom: 'episode:gongzi:2026-10-03',
                }),
            },
        );

        expect(result.current.focus).toBe('gongzi:2026-10-03');
        expect(result.current.state).toEqual({ zoomFrom: 'episode:gongzi:2026-10-03' });
    });

    it('should leave history alone without a focus', () => {
        const { result } = renderHook(
            () => ({ focus: useEpisodeFocus(), state: useLocation().state as unknown }),
            { wrapper: withState({ url: 'b.aac' }) },
        );

        expect(result.current.focus).toBeUndefined();
        expect(result.current.state).toEqual({ url: 'b.aac' });
    });
});
