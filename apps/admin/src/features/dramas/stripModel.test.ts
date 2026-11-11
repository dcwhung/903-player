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
});
