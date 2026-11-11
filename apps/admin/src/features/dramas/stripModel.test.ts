import { arcTabNote, scheduleContextOf } from './stripModel';

const TODAY = '2026-11-10';
const drama = { addedAt: '2026-10-01' };
const arc = {
    id: 'first-love',
    episodes: 33,
    addedAt: '2026-10-27',
    episodeDates: { 11: '2026-11-03', 21: '2026-11-17' },
    episodeRemovedAt: { '1-5': '2026-11-08', '6-10': '2026-11-20' },
};

describe('stripModel', () => {
    it('should keep the listed batches and the removals already past', () => {
        expect(scheduleContextOf(drama, arc, TODAY)).toEqual({
            firstNo: 1,
            count: 33,
            today: TODAY,
            listed: [
                { first: 1, last: 10, date: '2026-10-27' },
                { first: 11, last: 20, date: '2026-11-03' },
            ],
            unlisted: { '1-5': '2026-11-08' },
        });
    });

    it('should describe each arc tab', () => {
        expect(arcTabNote(drama, arc, false, TODAY)).toBe('無排程');
        expect(arcTabNote(drama, arc, true, TODAY)).toBe('已上 20 / 33 集');
        expect(arcTabNote(drama, { episodes: 5, addedAt: '2026-11-16' }, true, TODAY)).toBe('定期');
        // mockup ①：全部已上架（例如只設下架）嘅短篇 chip 寫「已全部上架」，唔係「定期」
        expect(arcTabNote(drama, { episodes: 5, addedAt: '2026-11-01' }, true, TODAY)).toBe(
            '已全部上架',
        );
    });

    // Bug：掃描建嘅新短篇 addedAt = 掃描當日、enabled: false；冇排程唔可以當「已上架」（player 唔出下架短篇）
    describe('disabled arc without a schedule', () => {
        const scanned = { id: 'love-after', episodes: 20, addedAt: TODAY, enabled: false };

        it('should not list any released batch or past removal', () => {
            const context = scheduleContextOf(
                drama,
                { ...scanned, episodeRemovedAt: { 1: TODAY } },
                TODAY,
            );
            expect(context.listed).toEqual([]);
            expect(context.unlisted).toEqual({});
        });

        it('should not fall back to the drama addedAt either', () => {
            const noDate = { id: scanned.id, episodes: scanned.episodes, enabled: false };
            expect(scheduleContextOf(drama, noDate, TODAY).listed).toEqual([]);
        });

        it('should follow the saved schedule when the arc has one', () => {
            const context = scheduleContextOf(drama, { ...arc, enabled: false }, TODAY, true);
            expect(context.listed).toHaveLength(2);
        });
    });
});
