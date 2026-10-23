import { renderHook } from '@testing-library/react';
import { createHookWrapper } from '../../tests/renderWithProviders';
import { dailyEpisodesOf } from '../data/dramaCatalog';
import { saveProgress } from '../services/progressStore';
import { useNewDramaIds } from './useNewDramaIds';

// 18 樓 C 座暫時停用；「New」嘅計法照測，當佢開咗
vi.mock('../config/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../config/dramas')>();
    return { ...actual, enabledDramas: () => actual.DRAMAS };
});

const newIds = () => {
    const { wrapper } = createHookWrapper();
    return renderHook(() => useNewDramaIds(), { wrapper }).result.current;
};

describe('useNewDramaIds', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 香港 23/10 16:00
    });
    afterEach(() => vi.useRealTimers());

    it('marks the daily drama New when today’s episode is unwatched', () => {
        expect([...newIds()]).toEqual(['c18']);
    });

    it('drops New once today’s episode has been listened to', () => {
        saveProgress(dailyEpisodesOf('c18')[0]?.url ?? '', 990, 1000);
        expect(newIds().size).toBe(0);
    });
});
