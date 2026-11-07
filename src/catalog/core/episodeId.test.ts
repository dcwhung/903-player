import { dailyEpisodeId, seriesEpisodeId, showEpisodeId } from './episodeId';

describe('episodeId', () => {
    it('should build a series id from drama, arc slug and episode number', () => {
        expect(seriesEpisodeId('chisee', '36-stratagems', 1)).toBe('drama:chisee:36-stratagems:1');
    });

    it('should keep episode zero in a series id', () => {
        expect(seriesEpisodeId('golden', 'season-1', 0)).toBe('drama:golden:season-1:0');
    });

    it('should build a daily id from drama and broadcast date', () => {
        expect(dailyEpisodeId('c18', '2025-08-13')).toBe('drama:c18:2025-08-13');
    });

    it('should build a show id from show and broadcast date', () => {
        expect(showEpisodeId('bad-girl', '2026-11-06')).toBe('show:bad-girl:2026-11-06');
    });
});
