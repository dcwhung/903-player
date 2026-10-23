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

    it('holds the full 芝See list: 10 短篇, 35 episodes, titles only where the file has one', () => {
        const episodes = seriesEpisodesOf('chisee');
        expect(episodes).toHaveLength(35);
        expect([...new Set(episodes.map((e) => e.arc))]).toEqual([
            '你生日所以我生日',
            '大妒忌',
            '好朋友手牽手',
            '小苦妹撲水',
            '我們都在會考中成長',
            '游乾水',
            '苦榮去做GYM',
            '青春期',
            '青春期眞神奇',
            'Ｘ時mas時小提議',
        ]);
        const first = episodes[0];
        expect(first?.title).toBeUndefined();
        expect(first?.url).toMatch(/%E7%AC%AC%E4%B8%80%E9%9B%86\.m4a$/);
        expect(episodes.at(-1)).toMatchObject({
            arc: 'Ｘ時mas時小提議',
            no: 4,
            title: '認認真真搵返個人',
        });
        expect(decodeURIComponent(episodes.at(-1)?.url ?? '')).toBe(
            'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/芝-See-菇-Bi-Family/Ｘ時mas時小提議/04 - Ｘ時mas時小提議 - 第四集 - 認認真真搵返個人.m4a',
        );
    });

    it('uses the R2 folder 游乾水 but keeps the file name 游亁水 as uploaded', () => {
        const first = seriesEpisodesOf('chisee').find((e) => e.arc === '游乾水');
        expect(decodeURIComponent(first?.url ?? '')).toBe(
            'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/芝-See-菇-Bi-Family/游乾水/01 - 游亁水 - 第一集.m4a',
        );
        // 每段路徑都要 encode（空格、中文、全形字）
        expect(first?.url).not.toMatch(/ /);
    });
});
