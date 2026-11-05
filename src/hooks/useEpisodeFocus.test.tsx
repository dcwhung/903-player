import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { focusUrlFromState, useEpisodeFocus } from './useEpisodeFocus';

const withState =
    (state: unknown) =>
    ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[{ pathname: '/show/gongzi', state }]}>
            {children}
        </MemoryRouter>
    );

describe('useEpisodeFocus', () => {
    it('should read focusUrl only when it is a string', () => {
        expect(focusUrlFromState({ focusUrl: 'a.aac' })).toBe('a.aac');
        expect(focusUrlFromState({ focusUrl: 3 })).toBeUndefined();
        expect(focusUrlFromState(null)).toBeUndefined();
    });

    it('should keep the focused episode but clear it from history, keeping the zoom source', () => {
        const { result } = renderHook(
            () => ({ focus: useEpisodeFocus(), state: useLocation().state as unknown }),
            { wrapper: withState({ focusUrl: 'a.aac', zoomFrom: 'episode:a.aac' }) },
        );

        expect(result.current.focus).toBe('a.aac');
        expect(result.current.state).toEqual({ zoomFrom: 'episode:a.aac' });
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
