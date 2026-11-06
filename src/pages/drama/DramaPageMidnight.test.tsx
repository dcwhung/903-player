/* S-699 / S-703：劇集頁開住過咗香港午夜，唔使用戶郁都會出新一批、收走已下架嘅短篇 */
import { act, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../../catalog/dramas';
import { saveProgress } from '../../services/progressStore';
import { DramaPage } from './DramaPage';

/** 呢日香港 00:00：大妒忌上架、好朋友手牽手下架（vi.mock hoist 咗，常數要一齊 hoist） */
const { MIDNIGHT, RELEASED_AT_MIDNIGHT, REMOVED_AT_MIDNIGHT } = vi.hoisted(() => ({
    MIDNIGHT: '2026-12-01',
    RELEASED_AT_MIDNIGHT: '大妒忌',
    REMOVED_AT_MIDNIGHT: '好朋友手牽手',
}));
const ONE_MINUTE = 60_000;

// 真 catalog 嘅芝See，改兩個短篇嘅上架 / 下架日（其他劇照舊）
vi.mock('../../catalog/dramas/lib/bundledSource', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas/lib/bundledSource')>();
    const patchArc = (arc: Record<string, unknown>) => {
        if (arc.name === RELEASED_AT_MIDNIGHT) return { ...arc, addedAt: MIDNIGHT };
        if (arc.name === REMOVED_AT_MIDNIGHT) return { ...arc, removedAt: MIDNIGHT };
        return arc;
    };
    return {
        bundledSource: {
            folders: () =>
                actual.bundledSource.folders().map((folder) => {
                    if (folder.id !== 'chisee') return folder;
                    const definition = folder.definition as { arcs: Record<string, unknown>[] };
                    return {
                        ...folder,
                        definition: { ...definition, arcs: definition.arcs.map(patchArc) },
                    };
                }),
        },
    };
});

/** 短篇 chips：[名, 撳唔撳到]（即將上架嘅 chip aria-disabled） */
const chips = () =>
    within(screen.getByRole('group', { name: '短篇' }))
        .getAllByRole('button')
        .map((b) => [b.textContent ?? '', b.getAttribute('aria-disabled') !== 'true'] as const);
const chipOf = (arc: string) => chips().find(([name]) => name.startsWith(arc));

describe('DramaPage across Hong Kong midnight', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-30T15:59:00Z')); // 香港 30/11 23:59
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    it('should release and remove arcs at midnight without any user interaction', () => {
        // 聽過先（唔係第一次入，唔會一入嚟開全集表）
        saveProgress(seriesEpisodesOf('chisee')[0]?.url ?? '', 60, 1200);
        renderWithProviders(<DramaPage />, { route: '/drama/chisee', path: '/drama/:dramaId' });

        expect(chipOf(REMOVED_AT_MIDNIGHT)?.[1]).toBe(true);
        expect(chipOf(RELEASED_AT_MIDNIGHT)?.[1]).toBe(false);

        act(() => vi.advanceTimersByTime(ONE_MINUTE)); // 香港 01/12 00:00

        expect(chipOf(REMOVED_AT_MIDNIGHT)).toBeUndefined();
        expect(chipOf(RELEASED_AT_MIDNIGHT)?.[1]).toBe(true);
    });
});
