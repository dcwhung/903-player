import type { Progress } from '../services/progressStore';
import type { SeriesEpisode } from '../types/drama';
import { releasedEpisodes } from './availability';
import { dramaShelfOrder, type ShelfDrama } from './dramaShelf';

const EPISODES_PER_DRAMA = 2;

const drama = (name: string, addedAt?: string): ShelfDrama => ({
    id: name,
    name,
    ...(addedAt ? { addedAt } : {}),
});

const episodesOf = (id: string): SeriesEpisode[] =>
    Array.from({ length: EPISODES_PER_DRAMA }, (_, i) => ({
        kind: 'series',
        dramaId: id,
        id: `drama:${id}:a:${i + 1}`,
        url: `/dramas/${id}/${i + 1}.m4a`,
        arc: 'A',
        no: i + 1,
    }));

const progress = (updatedAt: number, watched = false): Progress => ({
    position: watched ? 990 : 100,
    duration: 1000,
    watched,
    updatedAt,
});

/** 某套劇第 n 集嘅進度（key = episode ID） */
const at = (id: string, no: number, p: Progress) => ({ [`drama:${id}:a:${no}`]: p });

/** 全部集數聽完 */
const finished = (id: string, updatedAt: number) => ({
    ...at(id, 1, progress(updatedAt, true)),
    ...at(id, 2, progress(updatedAt, true)),
});

const order = (
    dramas: readonly ShelfDrama[],
    progressMap: Readonly<Record<string, Progress>> = {},
) => dramaShelfOrder(dramas, episodesOf, progressMap).map((d) => d.name);

describe('dramaShelfOrder', () => {
    it('puts the newest addedAt first when nothing has been listened to', () => {
        const dramas = [
            drama('甲', '2026-10-01'),
            drama('乙', '2026-10-26'),
            drama('丙', '2026-10-24'),
        ];

        expect(order(dramas)).toEqual(['乙', '丙', '甲']);
    });

    it('treats a drama without addedAt as the oldest', () => {
        const dramas = [drama('甲'), drama('乙', '2020-01-01')];

        expect(order(dramas)).toEqual(['乙', '甲']);
    });

    it('breaks a same-day tie by stroke count of the name', () => {
        const dramas = [drama('黃金少年', '2026-10-26'), drama('少爺占系列', '2026-10-26')];

        expect(order(dramas)).toEqual(['少爺占系列', '黃金少年']);
    });

    it('orders dramas without addedAt among themselves by strokes', () => {
        const dramas = [drama('森美小儀系列'), drama('芝See菇BiFamily'), drama('十八樓C座')];

        expect(order(dramas)).toEqual(['十八樓C座', '芝See菇BiFamily', '森美小儀系列']);
    });

    it('puts a drama being listened to ahead of newer ones', () => {
        const dramas = [drama('新', '2026-10-26'), drama('舊')];

        expect(order(dramas, at('舊', 1, progress(1)))).toEqual(['舊', '新']);
    });

    it('counts a drama with some episodes watched but not all as listening', () => {
        const dramas = [drama('新', '2026-10-26'), drama('舊')];

        expect(order(dramas, at('舊', 1, progress(1, true)))).toEqual(['舊', '新']);
    });

    it('puts the most recently listened drama first among those being listened to', () => {
        const dramas = [drama('甲', '2026-10-26'), drama('乙'), drama('丙')];
        const map = {
            ...at('甲', 1, progress(100)),
            ...at('乙', 2, progress(300)),
            ...at('乙', 1, progress(50, true)),
            ...at('丙', 1, progress(200)),
        };

        expect(order(dramas, map)).toEqual(['乙', '丙', '甲']);
    });

    it('falls back to addedAt then strokes when listening times tie', () => {
        const dramas = [
            drama('黃金少年'),
            drama('少爺占系列'),
            drama('森美小儀系列', '2026-10-26'),
        ];
        const map = {
            ...at('黃金少年', 1, progress(100)),
            ...at('少爺占系列', 1, progress(100)),
            ...at('森美小儀系列', 1, progress(100)),
        };

        expect(order(dramas, map)).toEqual(['森美小儀系列', '少爺占系列', '黃金少年']);
    });

    it('puts finished dramas last, by addedAt then strokes, however recently finished', () => {
        const dramas = [
            drama('黃金少年', '2026-10-24'),
            drama('森美小儀系列', '2026-10-26'),
            drama('少爺占系列', '2026-10-26'),
            drama('芝See菇BiFamily'),
            drama('十八樓C座'),
        ];
        const map = {
            ...finished('森美小儀系列', 900),
            ...finished('黃金少年', 800),
            ...finished('少爺占系列', 100),
            ...at('十八樓C座', 1, progress(1)),
        };

        expect(order(dramas, map)).toEqual([
            '十八樓C座',
            '芝See菇BiFamily',
            '少爺占系列',
            '森美小儀系列',
            '黃金少年',
        ]);
    });

    it('never counts a drama without episodes as finished', () => {
        const dramas = [drama('甲'), drama('乙', '2026-10-26')];
        const noEpisodes = () => [];

        expect(dramaShelfOrder(dramas, noEpisodes, {}).map((d) => d.name)).toEqual(['乙', '甲']);
    });

    it('keeps the extra fields of each drama and leaves the input untouched', () => {
        const dramas = [
            { ...drama('甲'), extra: 1 },
            { ...drama('乙', '2026-10-26'), extra: 2 },
        ];

        expect(dramaShelfOrder(dramas, episodesOf, {}).map((d) => d.extra)).toEqual([2, 1]);
        expect(dramas.map((d) => d.name)).toEqual(['甲', '乙']);
    });
});

// W-531：用戶規則「下架後書架排位唔郁」——排位用 catalog 已上架嘅集數（包括已下架）
describe('dramaShelfOrder with removed episodes (W-531)', () => {
    const removedFirst = (id: string): SeriesEpisode[] =>
        episodesOf(id).map((e) => (e.no === 1 ? { ...e, removedAt: '2026-12-01' } : e));
    const catalogOf = (id: string) => (id === 'A' ? removedFirst(id) : episodesOf(id));
    const shelfAt = (today: string, progressMap: Readonly<Record<string, Progress>>) =>
        dramaShelfOrder(
            [drama('A'), drama('B')],
            (id) => releasedEpisodes(catalogOf(id), today),
            progressMap,
        ).map((d) => d.id);

    it('should keep the drama heard most recently first after that episode is removed', () => {
        const heard = { ...at('A', 1, progress(9)), ...at('B', 1, progress(5)) };
        expect(shelfAt('2026-11-30', heard)).toEqual(['A', 'B']);
        expect(shelfAt('2026-12-01', heard)).toEqual(['A', 'B']);
    });

    it('should not treat a drama as finished because its unheard episode was removed', () => {
        const heard = at('A', 2, progress(1, true));
        expect(shelfAt('2026-11-30', heard)).toEqual(['A', 'B']);
        expect(shelfAt('2026-12-01', heard)).toEqual(['A', 'B']);
    });

    it('should leave out episodes not released yet', () => {
        const [first] = episodesOf('A');
        const later = [
            ...episodesOf('A'),
            { ...first!, no: 3, id: 'x', url: '/x', addedAt: '2026-12-05' },
        ];
        expect(releasedEpisodes(later, '2026-12-01')).toHaveLength(EPISODES_PER_DRAMA);
    });
});
