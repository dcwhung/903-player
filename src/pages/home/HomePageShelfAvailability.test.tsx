/* W-531 / S-703：部分集數 / 短篇下架之後，主頁廣播劇書架排位唔郁（用戶揀「下架後書架排位唔郁」） */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { catalogEpisodesOf } from '../../catalog/dramas';
import { saveProgress } from '../../services/progressStore';
import type { DramaEpisode } from '../../types/drama';
import { HomePage } from './HomePage';

/** 呢日香港 00:00 落架（vi.mock hoist 咗，常數要一齊 hoist） */
const { REMOVAL } = vi.hoisted(() => ({ REMOVAL: '2026-12-01' }));
const DAY_BEFORE = new Date('2026-11-30T08:00:00Z'); // 香港 30/11 16:00
const REMOVAL_DAY = new Date('2026-12-01T08:00:00Z'); // 香港 01/12 16:00

/*
 * 真 catalog，改幾個下架日（其他照舊）：
 * - 芝See：好朋友手牽手第 1 集下架
 * - 少爺占：忠孝公路最後一集（第 17 集）下架
 * - 森美小儀：森美幻想劇當係 20/11 先上架嘅最新短篇，同日（REMOVAL）成個下架
 */
vi.mock('../../catalog/dramas/lib/bundledSource', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas/lib/bundledSource')>();
    const PATCHES: Record<string, Record<string, Record<string, unknown>>> = {
        chisee: { 好朋友手牽手: { episodeRemovedAt: { '1': REMOVAL } } },
        jim: { 忠孝公路: { episodeRemovedAt: { '17': REMOVAL } } },
        'sammy-kitty': { 森美幻想劇: { addedAt: '2026-11-20', removedAt: REMOVAL } },
    };
    return {
        bundledSource: {
            folders: () =>
                actual.bundledSource.folders().map((folder) => {
                    const patches = PATCHES[folder.id];
                    if (!patches) return folder;
                    const definition = folder.definition as { arcs: Record<string, unknown>[] };
                    const arcs = definition.arcs.map((arc) => ({
                        ...arc,
                        ...patches[String(arc.name)],
                    }));
                    return { ...folder, definition: { ...definition, arcs } };
                }),
        },
    };
});

const episodesIn = (dramaId: string, arc: string): DramaEpisode[] =>
    catalogEpisodesOf(dramaId).filter((e) => e.kind === 'series' && e.arc === arc);

/** 書架次序：每套劇一粒入頁掣（「繼續收聽」掣另外一粒，唔計） */
const shelfOrderOn = async (day: Date): Promise<string[]> => {
    vi.setSystemTime(day);
    const { unmount } = renderWithProviders(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));
    const nav = screen.getByRole('navigation', { name: '廣播劇' });
    const order = within(nav)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label') ?? '')
        .filter((label) => !label.includes('繼續收聽'))
        .map((label) => label.split('，')[0] ?? '');
    unmount();
    return order;
};

describe('HomePage drama shelf when episodes go off air', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(DAY_BEFORE);
    });
    afterEach(() => vi.useRealTimers());

    it('should keep a drama listened to most recently first after the episode in progress goes off air', async () => {
        saveProgress(episodesIn('golden', 'Season 1')[0]?.url ?? '', 250, 1000);
        vi.setSystemTime(new Date('2026-11-30T08:05:00Z')); // 最近聽緊嘅係芝See第 1 集（下架嗰集）
        saveProgress(episodesIn('chisee', '好朋友手牽手')[0]?.url ?? '', 250, 1000);

        const before = await shelfOrderOn(DAY_BEFORE);
        const after = await shelfOrderOn(REMOVAL_DAY);

        expect(before.slice(0, 2)).toEqual(['芝See菇Bi Family', '黃金少年']);
        expect(after).toEqual(before);
    });

    it('should not move a drama to the finished end when its only unheard episode goes off air', async () => {
        const unheard = episodesIn('jim', '忠孝公路').at(-1)?.url;
        catalogEpisodesOf('jim')
            .filter((e) => e.url !== unheard)
            .forEach((e) => saveProgress(e.url, 990, 1000));

        const before = await shelfOrderOn(DAY_BEFORE);
        const after = await shelfOrderOn(REMOVAL_DAY);

        expect(before[0]).toBe('少爺占系列');
        expect(after).toEqual(before);
    });

    it('should not move a drama back when its newest arc goes off air', async () => {
        const before = await shelfOrderOn(DAY_BEFORE);
        const after = await shelfOrderOn(REMOVAL_DAY);

        // 森美小儀排位用最新短篇（森美幻想劇 20/11），排喺蘭茜夫人劇場（27/10）前面
        expect(before).toEqual([
            '森美小儀系列',
            '蘭茜夫人劇場',
            '少爺占系列',
            '芝See菇Bi Family',
            '黃金少年',
        ]);
        expect(after).toEqual(before);
    });
});
