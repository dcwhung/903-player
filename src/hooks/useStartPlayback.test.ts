import { act, renderHook } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { useStartPlayback } from './useStartPlayback';

const SATURDAY = recording('gongzi', '2026-10-17');
const MONDAY = recording('badgirl', '2026-10-19', '1000');

describe('useStartPlayback', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
    afterEach(() => vi.useRealTimers());

    it('starts the latest day when no show airs today', () => {
        vi.setSystemTime(new Date('2026-10-18T08:00:00Z')); // 香港 18/10（日）16:00
        const { audio, wrapper } = createHookWrapper([SATURDAY]);
        const { result } = renderHook(() => useStartPlayback(), { wrapper });

        act(() => result.current.startToday());

        expect(audio.src).toBe(SATURDAY.url);
    });

    it('starts nothing on a weekday with nothing up yet', () => {
        vi.setSystemTime(new Date('2026-10-20T08:00:00Z')); // 香港 20/10（二）16:00
        const { audio, wrapper } = createHookWrapper([MONDAY]);
        const { result } = renderHook(() => useStartPlayback(), { wrapper });

        act(() => result.current.startToday());

        expect(audio.src).toBe('');
    });
});
