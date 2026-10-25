import { renderHook } from '@testing-library/react';
import { createHookWrapper } from '../../tests/renderWithProviders';
import { dailyEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import { saveProgress } from '../services/progressStore';
import { useDramaNewLabels } from './useDramaNewLabels';

// 18 樓 C 座暫時停用；「新」嘅計法照測，當佢開咗
vi.mock('../config/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../config/dramas')>();
    return { ...actual, enabledDramas: () => actual.DRAMAS };
});

// 唔靠真清單嘅上架日子：芝See 只當「Ｘ時mas時小提議」係 20/10 新上架，其他短篇全部當舊，睇吓主頁「新」點計；
// 黃金少年用真日子（24/10 成套一齊上架）
vi.mock('../data/dramaCatalog', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../data/dramaCatalog')>();
    const withNewArc = (id: Parameters<typeof actual.seriesEpisodesOf>[0]) =>
        id === 'golden'
            ? actual.seriesEpisodesOf(id)
            : actual
                  .seriesEpisodesOf(id)
                  .map(({ addedAt: _realAddedAt, ...e }) =>
                      e.arc === 'Ｘ時mas時小提議' ? { ...e, addedAt: '2026-10-20' } : e,
                  );
    return { ...actual, seriesEpisodesOf: withNewArc };
});

const labels = () => {
    const { wrapper } = createHookWrapper();
    return renderHook(() => useDramaNewLabels(), { wrapper }).result.current;
};

describe('useDramaNewLabels', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 香港 23/10 16:00
    });
    afterEach(() => vi.useRealTimers());

    it('labels a series with an unheard new 短篇, and the daily drama with today’s episode', () => {
        expect(Object.fromEntries(labels())).toEqual({
            chisee: '有新短篇',
            c18: '今日有新一集',
        });
    });

    it('drops 新 once the new 短篇 has been touched, or today’s episode listened to', () => {
        const xmas = seriesEpisodesOf('chisee').find((e) => e.arc === 'Ｘ時mas時小提議');
        saveProgress(xmas?.url ?? '', 30, 160);
        saveProgress(dailyEpisodesOf('c18')[0]?.url ?? '', 990, 1000);
        expect(labels().size).toBe(0);
    });

    it('calls a drama added as a whole 新上架, but keeps 有新短篇 for one new 短篇', () => {
        vi.setSystemTime(new Date('2026-10-25T08:00:00Z'));
        expect(labels().get('golden')).toBe('新上架');
        expect(labels().get('chisee')).toBe('有新短篇');
    });

    it('stops calling a 短篇 new 14 days after it was added', () => {
        vi.setSystemTime(new Date('2026-11-03T08:00:00Z'));
        expect(labels().has('chisee')).toBe(false);
    });
});
