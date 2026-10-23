import { DRAMAS } from '../config/dramas';
import { dailyEpisodesOf, dramaEpisodesOf, seriesEpisodesOf } from './dramaCatalog';

describe('dramaCatalog', () => {
    it('has episodes for every drama, each with its own url', () => {
        DRAMAS.forEach((drama) => {
            const episodes = dramaEpisodesOf(drama.id);
            expect(episodes.length).toBeGreaterThan(0);
            expect(episodes.every((e) => e.dramaId === drama.id && e.kind === drama.kind)).toBe(
                true,
            );
        });
        const urls = DRAMAS.flatMap((d) => dramaEpisodesOf(d.id)).map((e) => e.url);
        expect(new Set(urls).size).toBe(urls.length);
    });

    it('numbers the series episodes from 1 within each arc', () => {
        const episodes = seriesEpisodesOf('chisee');
        const arcs = new Set(episodes.map((e) => e.arc));
        arcs.forEach((arc) => {
            const numbers = episodes.filter((e) => e.arc === arc).map((e) => e.no);
            expect(numbers).toEqual(numbers.map((_, i) => i + 1));
        });
    });

    it('only hands out episodes of the matching kind', () => {
        expect(seriesEpisodesOf('c18')).toEqual([]);
        expect(dailyEpisodesOf('chisee')).toEqual([]);
        expect(dailyEpisodesOf('c18').some((e) => e.rerun)).toBe(true);
    });
});
