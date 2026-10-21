import { act, renderHook } from '@testing-library/react';
import { createHookWrapper, recording, unavailableEpisode } from '../../tests/renderWithProviders';
import type { Recording } from '../types/recording';
import { useStartPlayback } from './useStartPlayback';

const YESTERDAY = recording('badgirl', '2026-10-19', '1000');
const noProbe = async (): Promise<Recording[]> => [];

describe('useStartPlayback', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-20T08:00:00Z')); // 香港 20/10 16:00
    });
    afterEach(() => vi.useRealTimers());

    it('starts the latest day when today has nothing yet', () => {
        const { audio, wrapper } = createHookWrapper([YESTERDAY]);
        const { result } = renderHook(() => useStartPlayback(), { wrapper });

        act(() => result.current.startToday());

        expect(audio.src).toBe(YESTERDAY.url);
    });

    it('starts nothing when today only has unavailable shows', () => {
        const { audio, wrapper } = createHookWrapper([YESTERDAY], noProbe, [
            unavailableEpisode('wanni', '2026-10-20', '0708'),
        ]);
        const { result } = renderHook(() => useStartPlayback(), { wrapper });

        act(() => result.current.startToday());

        expect(audio.src).toBe('');
    });
});
