import type { ArcAvailability, SeriesEpisode } from '@903-player/catalog';
import type { ArcSummary } from '../../selectors/arcProgress';
import {
    arcNotesOf,
    batchItemsOf,
    chipLeavingOf,
    dramaNoticeOf,
    episodeLeavingOf,
    upcomingChipsOf,
} from './seriesAvailability';

const TODAY = '2026-11-05';

const arcInfo = (arc: string, extra: Partial<ArcAvailability> = {}): ArcAvailability => ({
    arc,
    firstNo: 1,
    count: 30,
    batches: [],
    removals: [],
    ...extra,
});

const ep = (no: number): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'lancy',
    id: `id:/half/${no}`,
    url: `/half/${no}`,
    arc: '戀愛二分一',
    no,
});

const summary = (extra: Partial<ArcSummary>): ArcSummary => ({
    arc: '戀愛二分一',
    total: 10,
    watched: 0,
    state: 'new',
    isNew: false,
    resume: ep(1),
    resumeAt: 0,
    ...extra,
});

const BATCHED = arcInfo('戀愛二分一', {
    batches: [
        { first: 11, last: 20, date: '2026-11-19' },
        { first: 21, last: 30, date: '2026-11-26' },
    ],
});

describe('series drama availability builders', () => {
    it('should make a chip for each upcoming arc with the short F3 day', () => {
        const arcs = [arcInfo('A'), arcInfo('XXX', { addedAt: '2026-11-12', count: 20 })];
        expect(upcomingChipsOf(arcs, TODAY)).toEqual([
            { arc: 'XXX', text: '12/11 上架', label: 'XXX，12/11 星期四 上架' },
        ]);
    });

    it('should tag a chip only when the arc itself leaves soon (LK1)', () => {
        expect(chipLeavingOf(arcInfo('A', { removedAt: '2026-12-05' }), TODAY)).toEqual({
            tag: '05/12 下架',
            label: '05/12 星期六 下架',
        });
        expect(chipLeavingOf(arcInfo('A'), TODAY)).toBeUndefined();
        // 成套劇同日（或者更早）下架：只喺「全集」chip 講一次，短篇 chip 唔重覆
        const sameDay = arcInfo('A', { removedAt: '2026-12-05' });
        expect(chipLeavingOf(sameDay, TODAY, '2026-12-05')).toBeUndefined();
        expect(chipLeavingOf(sameDay, TODAY, '2026-12-20')?.tag).toBe('05/12 下架');
    });

    it('should count every episode and name the next batch (A2)', () => {
        expect(arcNotesOf(BATCHED, summary({}), 10, TODAY)).toEqual({
            total: 30,
            suffixes: ['第 11 集起 19/11 上架'],
            spokenSuffixes: ['第 11 集起 19/11 星期四 上架'],
        });
        const caughtUp = summary({ watched: 10, state: 'done' });
        expect(arcNotesOf(BATCHED, caughtUp, 10, TODAY)?.status).toBe('已收聽到第 10 集（最新）');
    });

    it('should badge and date an arc or a range leaving soon (LS2)', () => {
        expect(
            arcNotesOf(arcInfo('A', { removedAt: '2026-12-05' }), summary({}), 10, TODAY),
        ).toEqual({
            suffixes: ['05/12 下架'],
            spokenSuffixes: ['05/12 星期六 下架'],
            badge: '快將下架',
        });
        const ranged = arcInfo('A', { removals: [{ first: 1, last: 5, date: '2026-12-05' }] });
        expect(arcNotesOf(ranged, summary({}), 10, TODAY)).toEqual({
            suffixes: ['第 1 至 5 集 05/12 下架'],
            spokenSuffixes: ['第 1 至 5 集 05/12 星期六 下架'],
            badge: '部分快將下架',
        });
        expect(arcNotesOf(arcInfo('A'), summary({}), 10, TODAY)).toBeUndefined();
    });

    it('should fold each batch not out yet into one row', () => {
        const [first, second] = batchItemsOf(BATCHED, TODAY);
        expect(first).toMatchObject({
            key: 'batch:戀愛二分一:11',
            dayMonth: '第 11 至 20 集',
            status: { kind: 'upcoming', text: '19/11（四）上架' },
            episodeCount: 10,
            label: '第 11 至 20 集，19/11 星期四 上架',
        });
        expect(second?.dayMonth).toBe('第 21 至 30 集');
        expect(batchItemsOf(BATCHED, '2026-11-26')).toEqual([]);
    });

    it('should give the leaving day of an episode in a range leaving soon (LE1)', () => {
        const ranged = arcInfo('A', { removals: [{ first: 1, last: 5, date: '2026-11-06' }] });
        expect(episodeLeavingOf(ranged, 3, TODAY)).toEqual({
            text: '明日下架',
            tag: '明日',
            label: '06/11 星期五 下架',
        });
        expect(episodeLeavingOf(ranged, 6, TODAY)).toBeUndefined();
    });

    it('should word the whole-drama leaving note for the page and the sheet', () => {
        expect(dramaNoticeOf({ removedAt: '2026-12-05' }, TODAY)).toEqual({
            page: '本廣播劇系列 05/12（六）下架',
            tag: '05/12 下架',
            label: '本廣播劇系列 05/12 星期六 下架',
        });
        expect(dramaNoticeOf({ removedAt: '2027-02-01' }, TODAY)).toBeUndefined();
    });
});
