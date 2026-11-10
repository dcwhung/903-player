import type { ArcAvailability, SeriesEpisode } from '../types/drama';
import {
    arcFreshDate,
    arcLeaving,
    dramaLeaving,
    earliestDate,
    isArcUpcoming,
    isAvailable,
    isLeavingSoon,
    isRemoved,
    latestDate,
    leavingRanges,
    sameRemovalDay,
    nextRelease,
    pendingBatches,
    upcomingArcs,
} from './availability';

const TODAY = '2026-11-05';

const arcInfo = (arc: string, extra: Partial<ArcAvailability> = {}): ArcAvailability => ({
    arc,
    firstNo: 1,
    count: 30,
    batches: [],
    removals: [],
    ...extra,
});

const ep = (arc: string, no: number, extra: Partial<SeriesEpisode> = {}): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'lancy',
    id: `id:/${arc}/${no}`,
    url: `/${arc}/${no}`,
    arc,
    no,
    ...extra,
});

describe('release and removal dates', () => {
    it('should treat a future addedAt as upcoming and today as released (HK 00:00)', () => {
        expect(isArcUpcoming('2026-11-06', TODAY)).toBe(true);
        expect(isArcUpcoming(TODAY, TODAY)).toBe(false);
        expect(isArcUpcoming(undefined, TODAY)).toBe(false);
    });

    it('should treat removedAt as gone from that day on', () => {
        expect(isRemoved(TODAY, TODAY)).toBe(true);
        expect(isRemoved('2026-11-06', TODAY)).toBe(false);
        expect(isRemoved(undefined, TODAY)).toBe(false);
    });

    it('should flag leaving soon only within LEAVING_SOON_DAYS before removal', () => {
        expect(isLeavingSoon('2026-12-05', TODAY)).toBe(true);
        expect(isLeavingSoon('2026-12-06', TODAY)).toBe(false);
        expect(isLeavingSoon('2026-11-06', TODAY)).toBe(true);
        expect(isLeavingSoon(TODAY, TODAY)).toBe(false);
        expect(isLeavingSoon(undefined, TODAY)).toBe(false);
    });

    it('should be available only between addedAt and removedAt', () => {
        expect(isAvailable({ addedAt: TODAY, removedAt: '2026-11-06' }, TODAY)).toBe(true);
        expect(isAvailable({ addedAt: '2026-11-06' }, TODAY)).toBe(false);
        expect(isAvailable({ removedAt: TODAY }, TODAY)).toBe(false);
        expect(isAvailable({}, TODAY)).toBe(true);
    });

    it('should pick the earliest / latest defined date', () => {
        expect(earliestDate(['2026-12-05', undefined, '2026-12-01'])).toBe('2026-12-01');
        expect(latestDate([undefined, '2026-10-27', '2026-11-19'])).toBe('2026-11-19');
        expect(earliestDate([undefined])).toBeUndefined();
    });
});

describe('upcoming arcs and batches', () => {
    it('should list arcs not released yet, and arcs past addedAt without episodes', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const arcs = [
            arcInfo('戀愛二分一'),
            arcInfo('XXX', { addedAt: '2026-11-12', count: 20 }),
            arcInfo('YYY', { addedAt: '2026-11-01', count: undefined }),
        ];
        expect(upcomingArcs(arcs, TODAY)).toEqual([
            { arc: 'XXX', addedAt: '2026-11-12', count: 20 },
            { arc: 'YYY', addedAt: '2026-11-01' },
        ]);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('YYY'));
        warn.mockRestore();
    });

    it('should carry the arc display label of an upcoming arc', () => {
        const arcs = [
            { ...arcInfo('R2 名', { addedAt: '2026-11-12', count: 2 }), arcLabel: '顯示名' },
        ];
        expect(upcomingArcs(arcs, TODAY)).toEqual([
            { arc: 'R2 名', arcLabel: '顯示名', addedAt: '2026-11-12', count: 2 },
        ]);
    });

    it('should warn once per arc and release date, not once per arc name (S-701)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const missing = (addedAt: string) => arcInfo('同名短篇', { addedAt, count: undefined });
        upcomingArcs([missing('2026-10-01')], TODAY);
        upcomingArcs([missing('2026-10-01')], TODAY);
        upcomingArcs([missing('2026-10-02')], TODAY);

        const calls = warn.mock.calls.filter(([msg]) => String(msg).includes('同名短篇'));
        expect(calls).toHaveLength(2);
        warn.mockRestore();
    });

    it('should give the batches still to come, each with its first and last episode', () => {
        const arc = arcInfo('戀愛二分一', {
            batches: [
                { first: 11, last: 20, date: '2026-11-19' },
                { first: 21, last: 30, date: '2026-11-26' },
            ],
        });
        expect(pendingBatches(arc, TODAY)).toHaveLength(2);
        expect(pendingBatches(arc, '2026-11-19')).toEqual([
            { first: 21, last: 30, date: '2026-11-26' },
        ]);
    });

    it('should name the next release for the home tile: earliest new arc or batch', () => {
        const arcs = [
            arcInfo('戀愛二分一', { batches: [{ first: 11, last: 20, date: '2026-11-19' }] }),
            arcInfo('XXX', { addedAt: '2026-11-12' }),
        ];
        expect(nextRelease(arcs, TODAY)).toEqual({ kind: 'arc', date: '2026-11-12' });
        expect(nextRelease(arcs.slice(0, 1), TODAY)).toEqual({
            kind: 'episodes',
            date: '2026-11-19',
        });
        expect(nextRelease([arcInfo('A')], TODAY)).toBeUndefined();
    });
});

describe('fresh date', () => {
    it('should count the latest released batch, not the first episode', () => {
        const inArc = [
            ep('戀愛二分一', 1, { addedAt: '2026-10-27' }),
            ep('戀愛二分一', 11, { addedAt: '2026-11-19' }),
        ];
        expect(arcFreshDate(inArc)).toBe('2026-11-19');
        expect(arcFreshDate([ep('A', 1)])).toBeUndefined();
    });
});

describe('leaving soon', () => {
    it('should name the drama when the whole drama leaves soon', () => {
        expect(dramaLeaving({ removedAt: '2026-12-05' }, [], TODAY)).toEqual({
            scope: 'drama',
            date: '2026-12-05',
        });
    });

    it('should fall back to arcs, then episode ranges, with the earliest date', () => {
        const arcs = [
            arcInfo('戀愛二分一', { removedAt: '2026-12-04' }),
            arcInfo('初戀無限次', { removedAt: '2026-12-01' }),
        ];
        expect(dramaLeaving({}, arcs, TODAY)).toEqual({ scope: 'arc', date: '2026-12-01' });
        const ranged = [
            arcInfo('戀愛二分一', { removals: [{ first: 1, last: 5, date: '2026-12-05' }] }),
        ];
        expect(dramaLeaving({}, ranged, TODAY)).toEqual({
            scope: 'episodes',
            date: '2026-12-05',
        });
        expect(dramaLeaving({ removedAt: '2027-03-01' }, [arcInfo('A')], TODAY)).toBe(undefined);
    });

    it('should ignore arcs that are not on the shelf (upcoming, already removed)', () => {
        const arcs = [arcInfo('XXX', { addedAt: '2026-11-12', removedAt: '2026-12-01' })];
        expect(dramaLeaving({}, arcs, TODAY)).toBeUndefined();
    });

    it('should describe one arc: own removal, else the episode ranges leaving soon', () => {
        expect(arcLeaving(arcInfo('A', { removedAt: '2026-12-05' }), TODAY)).toEqual({
            scope: 'arc',
            date: '2026-12-05',
        });
        const ranged = arcInfo('A', { removals: [{ first: 1, last: 5, date: '2026-12-05' }] });
        expect(arcLeaving(ranged, TODAY)).toEqual({
            scope: 'episodes',
            date: '2026-12-05',
            first: 1,
            last: 5,
        });
        expect(leavingRanges(ranged, TODAY)).toHaveLength(1);
        expect(arcLeaving(arcInfo('A'), TODAY)).toBeUndefined();
    });
});

describe('sameRemovalDay', () => {
    it('should say an inner removal is already told by the outer one only on the same day', () => {
        expect(sameRemovalDay('2026-12-19', '2026-12-19')).toBe(true);
        expect(sameRemovalDay('2026-12-19', '2026-12-01')).toBe(false);
        expect(sameRemovalDay(undefined, '2026-12-01')).toBe(false);
    });
});
