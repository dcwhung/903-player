import type { ArcAvailability } from '../../types/drama';
import { leavingCorner, upcomingTile, withReleaseSuffix } from './dramaTileNotices';

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
    it('should add the next new arc (H2) or new batch (E1) after the arc count', () => {
        const soon = [arcInfo('戀愛二分一'), arcInfo('XXX', { addedAt: '2026-11-12' })];
        expect(withReleaseSuffix('3 個短篇', soon, TODAY)).toBe('3 個短篇 · 新短篇 12/11 上架');
        const batch = [
            arcInfo('戀愛二分一', { batches: [{ first: 11, last: 20, date: '2026-11-06' }] }),
        ];
        expect(withReleaseSuffix('3 個短篇', batch, TODAY)).toBe('3 個短篇 · 全新集數 明日上架');
        expect(withReleaseSuffix('3 個短篇', [arcInfo('A')], TODAY)).toBe('3 個短篇');
    });

    it('should say which part leaves soon in the top-left corner', () => {
        expect(leavingCorner({ removedAt: '2026-12-05' }, [], TODAY)).toEqual({
            text: '05/12 下架',
            label: '05/12（六）下架',
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
            label: '18 樓 C 座，01/12（二）上架，未可以收聽',
        });
        expect(upcomingTile({ name: 'X', launchedAt: '2026-11-06' }, TODAY).text).toBe(
            '即將上架 · 明日',
        );
    });
});
