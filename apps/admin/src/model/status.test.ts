import { arcStatusOf, dailyStatusOf, entryDotOf, showStatusOf } from './status';

const TODAY = '2026-11-10';

describe('entryDotOf', () => {
    it('should treat shows as live unless enabled is false', () => {
        expect(entryDotOf('shows', {}, false, TODAY)).toBe('live');
        expect(entryDotOf('shows', { enabled: false }, false, TODAY)).toBe('off');
    });

    it('should mark dramas by enabled, draft and dates', () => {
        expect(entryDotOf('dramas', { enabled: true }, false, TODAY)).toBe('live');
        expect(entryDotOf('dramas', { enabled: false }, false, TODAY)).toBe('off');
        expect(entryDotOf('dramas', { enabled: false }, true, TODAY)).toBe('soon');
        expect(entryDotOf('dramas', { enabled: true, addedAt: '2026-11-20' }, false, TODAY)).toBe(
            'soon',
        );
        expect(entryDotOf('dramas', { enabled: true, removedAt: '2026-11-03' }, false, TODAY)).toBe(
            'off',
        );
    });

    it('should grey out a disabled entry that has never been published (未上架)', () => {
        expect(entryDotOf('dramas', { enabled: false }, false, TODAY, false)).toBe('unlisted');
        expect(entryDotOf('shows', { enabled: false }, false, TODAY, false)).toBe('unlisted');
        expect(entryDotOf('dramas', { enabled: false }, false, TODAY, true)).toBe('off');
        // 未知（舊 API 冇 published）照舊當已下架
        expect(entryDotOf('shows', { enabled: false }, false, TODAY, undefined)).toBe('off');
        expect(entryDotOf('dramas', { enabled: false }, true, TODAY, false)).toBe('soon');
    });
});

describe('arcStatusOf', () => {
    const drama = { addedAt: '2026-10-01' };

    it('should say 已上架 when every episode is out', () => {
        expect(arcStatusOf(drama, { episodes: 30 }, TODAY)).toEqual({ tone: 'ok', text: '已上架' });
    });

    it('should show a removal date and partial removals', () => {
        expect(arcStatusOf(drama, { episodes: 35, removedAt: '2026-11-03' }, TODAY)).toEqual({
            tone: 'bad',
            text: '已下架 · 11 月 3 日',
        });
        const part = { episodes: 30, episodeRemovedAt: { '1-18': '2026-11-01' } };
        expect(arcStatusOf(drama, part, TODAY)).toEqual({
            tone: 'part',
            text: '部分下架 · 餘 12 集',
        });
    });

    it('should describe future batches', () => {
        const batches = { episodes: 10, addedAt: '2026-11-16', episodeDates: { 6: '2026-11-18' } };
        expect(arcStatusOf(drama, batches, TODAY)).toEqual({
            tone: 'info',
            text: '排程中 · 11 月 16 日起',
        });
        expect(arcStatusOf(drama, { episodes: 5, addedAt: '2026-11-20' }, TODAY)).toEqual({
            tone: 'info',
            text: '11 月 20 日上架',
        });
        const progress = {
            episodes: 33,
            addedAt: '2026-10-27',
            episodeDates: { 21: '2026-11-12' },
        };
        expect(arcStatusOf(drama, progress, TODAY)).toEqual({
            tone: 'info',
            text: '排程中 · 已上 20 / 33 集',
        });
    });

    it('should call a disabled arc 未上架 when it was never published, 已下架 otherwise', () => {
        const off = { episodes: 3, enabled: false };
        const unlisted = { tone: 'unlisted', text: '未上架' };
        expect(arcStatusOf(drama, off, TODAY, { isNew: true })).toEqual(unlisted);
        expect(arcStatusOf(drama, off, TODAY, { published: false })).toEqual(unlisted);
        expect(arcStatusOf(drama, off, TODAY, { published: true })).toEqual({
            tone: 'bad',
            text: '已下架',
        });
        // 未知（舊 API）照舊
        expect(arcStatusOf(drama, off, TODAY)).toEqual({ tone: 'bad', text: '已下架' });
        // 上架緊嘅唔受影響
        expect(arcStatusOf(drama, { episodes: 3 }, TODAY, { published: false }).text).toBe(
            '已上架',
        );
    });
});

describe('dailyStatusOf', () => {
    it('should follow the drama dates', () => {
        expect(dailyStatusOf({ enabled: false }, TODAY).text).toBe('已下架');
        expect(dailyStatusOf({ enabled: true, addedAt: '2026-11-20' }, TODAY).text).toBe(
            '11 月 20 日上架',
        );
        expect(dailyStatusOf({ enabled: true }, TODAY).tone).toBe('ok');
    });

    it('should call a never-published disabled daily drama 未上架', () => {
        expect(dailyStatusOf({ enabled: false }, TODAY, false)).toEqual({
            tone: 'unlisted',
            text: '未上架',
        });
        expect(dailyStatusOf({ enabled: false }, TODAY, true).text).toBe('已下架');
    });
});

describe('showStatusOf', () => {
    it('should split disabled shows into 未上架 and 已下架', () => {
        expect(showStatusOf({}, true)).toEqual({ tone: 'ok', text: '上架中' });
        expect(showStatusOf({ enabled: false }, false)).toEqual({
            tone: 'unlisted',
            text: '未上架',
        });
        expect(showStatusOf({ enabled: false }, true)).toEqual({ tone: 'bad', text: '已下架' });
        expect(showStatusOf({ enabled: false }, undefined).text).toBe('已下架');
    });
});
