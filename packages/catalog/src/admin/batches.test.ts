import { batchesOf, compareBatches } from './batches';

const ARC = { firstNo: 1, count: 6 };
const TODAY = '2026-11-10';

describe('batchesOf', () => {
    it('should split addedAt + episodeDates into ranges up to the last episode', () => {
        const schedule = {
            addedAt: '2026-11-01',
            episodeDates: { '3': '2026-11-08', '5': '2026-11-15' },
        };
        expect(batchesOf(schedule, ARC)).toEqual([
            { first: 1, last: 2, date: '2026-11-01' },
            { first: 3, last: 4, date: '2026-11-08' },
            { first: 5, last: 6, date: '2026-11-15' },
        ]);
    });

    it('should give no batches without addedAt', () => {
        expect(batchesOf({ episodeDates: {} }, ARC)).toEqual([]);
    });
});

describe('compareBatches', () => {
    const current = {
        addedAt: '2026-11-01',
        episodeDates: { '3': '2026-11-08', '5': '2026-11-15' },
    };

    it('should not differ when the released batches keep their dates', () => {
        const expanded = {
            addedAt: '2026-11-01',
            episodeDates: { '3': '2026-11-08', '5': '2026-11-20' },
            episodeRemovedAt: {},
        };
        const result = compareBatches(current, expanded, ARC, TODAY);
        expect(result.released).toEqual([
            { first: 1, last: 2, date: '2026-11-01' },
            { first: 3, last: 4, date: '2026-11-08' },
        ]);
        expect(result.planned.at(-1)).toEqual({ first: 5, last: 6, date: '2026-11-20' });
        expect(result).toMatchObject({ differs: false, changedEpisodes: [] });
    });

    it('should list released episodes whose dates move under the new rule', () => {
        const expanded = {
            addedAt: '2026-11-01',
            episodeDates: { '2': '2026-11-03', '4': '2026-11-12' },
            episodeRemovedAt: {},
        };
        const result = compareBatches(current, expanded, ARC, TODAY);
        expect(result).toMatchObject({ differs: true, changedEpisodes: [2, 3, 4] });
    });

    it('should treat a batch released today as released', () => {
        const expanded = { addedAt: '2026-11-02', episodeDates: {}, episodeRemovedAt: {} };
        const result = compareBatches(current, expanded, ARC, '2026-11-01');
        expect(result.released).toEqual([{ first: 1, last: 2, date: '2026-11-01' }]);
        expect(result.changedEpisodes).toEqual([1, 2]);
    });

    it('should never differ for an arc with nothing released yet', () => {
        const expanded = { addedAt: '2026-12-01', episodeDates: {}, episodeRemovedAt: {} };
        expect(compareBatches({ addedAt: '2026-11-20' }, expanded, ARC, TODAY).differs).toBe(false);
    });
});
