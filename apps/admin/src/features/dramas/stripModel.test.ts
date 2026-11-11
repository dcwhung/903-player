import { arcTabNote, stripOf } from './stripModel';

const TODAY = '2026-11-10';
const drama = { addedAt: '2026-10-01' };
const arc = {
    id: 'first-love',
    episodes: 33,
    addedAt: '2026-10-27',
    episodeDates: { 11: '2026-11-03', 21: '2026-11-17' },
};

describe('stripModel', () => {
    it('should split released batches from future ones', () => {
        const strip = stripOf(drama, arc, null, TODAY);
        expect(strip.past).toEqual([
            { first: 1, last: 10, date: '2026-10-27' },
            { first: 11, last: 20, date: '2026-11-03' },
        ]);
        expect(strip.future).toEqual([{ first: 21, last: 33, date: '2026-11-17' }]);
        expect(strip.comparison).toBeNull();
    });

    it('should flag a new rule that moves released episodes', () => {
        const expanded = {
            addedAt: '2026-11-12',
            episodeDates: { 6: '2026-11-14' },
            episodeRemovedAt: {},
        };
        const strip = stripOf(drama, arc, expanded, TODAY);
        expect(strip.future[0]).toEqual({ first: 1, last: 5, date: '2026-11-12' });
        expect(strip.comparison?.differs).toBe(true);
    });

    it('should describe each arc tab', () => {
        expect(arcTabNote(drama, arc, false, TODAY)).toBe('無排程');
        expect(arcTabNote(drama, arc, true, TODAY)).toBe('已上 20 / 33 集');
        expect(arcTabNote(drama, { episodes: 5, addedAt: '2026-11-16' }, true, TODAY)).toBe('定期');
    });

    // Bug：掃描建嘅新短篇 addedAt = 掃描當日、enabled: false；冇排程唔可以當「已上架」（player 唔出下架短篇）
    describe('disabled arc without a schedule', () => {
        const scanned = { id: 'love-after', episodes: 20, addedAt: TODAY, enabled: false };

        it('should not list any released batch', () => {
            const strip = stripOf(drama, scanned, null, TODAY);
            expect(strip.past).toEqual([]);
            expect(strip.unreleased).toBe(true);
        });

        it('should not fall back to the drama addedAt either', () => {
            const noDate = { id: scanned.id, episodes: scanned.episodes, enabled: false };
            expect(stripOf(drama, noDate, null, TODAY).past).toEqual([]);
        });

        it('should not flag released episodes as moved by a new rule', () => {
            const expanded = { addedAt: '2026-11-16', episodeDates: {}, episodeRemovedAt: {} };
            const strip = stripOf(drama, scanned, expanded, TODAY);
            expect(strip.comparison?.differs).toBe(false);
            expect(strip.future).toEqual([{ first: 1, last: 20, date: '2026-11-16' }]);
        });

        it('should follow the saved schedule when the arc has one', () => {
            const strip = stripOf(drama, { ...arc, enabled: false }, null, TODAY, true);
            expect(strip.past).toHaveLength(2);
            expect(strip.unreleased).toBe(false);
        });

        it('should keep enabled arcs released as before', () => {
            expect(stripOf(drama, arc, null, TODAY).unreleased).toBe(false);
        });
    });
});
