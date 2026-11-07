import type { ArcAvailability } from '@903-player/catalog';
import {
    leavingCorner,
    releaseNote,
    upcomingTile,
    withoutRepeatedLeaving,
} from './dramaTileNotices';

const TODAY = '2026-11-05';

const arcInfo = (arc: string, extra: Partial<ArcAvailability> = {}): ArcAvailability => ({
    arc,
    firstNo: 1,
    count: 30,
    batches: [],
    removals: [],
    ...extra,
});

describe('drama tile notices', () => {
    it('should name the next new arc (H2) or new batch (E1), with a short form and a long label', () => {
        const soon = [arcInfo('戀愛二分一'), arcInfo('XXX', { addedAt: '2026-11-12' })];
        expect(releaseNote(soon, TODAY)).toEqual({
            text: '全新短篇 12/11 上架',
            tag: '12/11 上架',
            label: '全新短篇 12/11 星期四 上架',
        });
        const batch = [
            arcInfo('戀愛二分一', { batches: [{ first: 11, last: 20, date: '2026-11-06' }] }),
        ];
        expect(releaseNote(batch, TODAY)).toEqual({
            text: '全新集數 明日上架',
            tag: '明日上架',
            label: '全新集數 06/11 星期五 上架',
        });
        expect(releaseNote([arcInfo('A')], TODAY)).toBeUndefined();
    });

    it('should say which part leaves soon in the top-left corner', () => {
        expect(leavingCorner({ removedAt: '2026-12-05' }, [], TODAY)).toEqual({
            text: '05/12 下架',
            tag: '05/12',
            short: '05/12 下架',
            label: '本廣播劇系列 05/12 星期六 下架',
            date: '2026-12-05',
        });
        const arcs = [arcInfo('戀愛二分一', { removedAt: '2026-11-07' })];
        expect(leavingCorner({}, arcs, TODAY)?.text).toBe('部分短篇 後日下架');
        const ranged = [arcInfo('A', { removals: [{ first: 1, last: 5, date: '2026-12-05' }] })];
        expect(leavingCorner({}, ranged, TODAY)?.text).toBe('部分集數 05/12 下架');
        expect(leavingCorner({}, [arcInfo('A')], TODAY)).toBeUndefined();
    });

    it('should label a whole upcoming drama for its greyed tile', () => {
        expect(upcomingTile({ name: '18 樓 C 座', launchedAt: '2026-12-01' }, TODAY)).toEqual({
            text: '即將上架 · 01/12',
            label: '18 樓 C 座，01/12 星期二 上架',
        });
        expect(upcomingTile({ name: 'X', launchedAt: '2026-11-06' }, TODAY).text).toBe(
            '即將上架 · 明日',
        );
    });
});

describe('withoutRepeatedLeaving', () => {
    const resume = (date: string) => ({
        label: '初戀無限次 · 第 2 集',
        ratio: 0.2,
        leaving: { text: 'x', tag: 'x', label: 'x', date },
    });

    it('should drop the 繼續收聽 date when the corner already says the same day', () => {
        expect(withoutRepeatedLeaving(resume('2026-12-19'), '2026-12-19')?.leaving).toBeUndefined();
    });

    it('should keep it when the days differ, or the corner says nothing', () => {
        expect(withoutRepeatedLeaving(resume('2026-12-01'), '2026-12-19')?.leaving).toBeDefined();
        expect(withoutRepeatedLeaving(resume('2026-12-01'), undefined)?.leaving).toBeDefined();
        expect(withoutRepeatedLeaving(undefined, '2026-12-19')).toBeUndefined();
    });
});
