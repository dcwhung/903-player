/* 黃金少年 regression：集數 / URL 必須同 R2 檔名一樣（URL 係已儲進度嘅 key），每季有自己碟面 */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import { dramaArtFor, dramaEpisodeTheme, findDrama, seriesEpisodesOf } from './index';

const R2_GOLDEN = `${DRAMA_AUDIO_BASE}/黃金少年`;
const SEASONS = [1, 2, 3, 4];

describe('黃金少年', () => {
    const golden = seriesEpisodesOf('golden');
    const inSeason = (n: number) => golden.filter((e) => e.arc === `Season ${n}`);

    it('is an enabled series drama counted in seasons', () => {
        expect(findDrama('golden')).toMatchObject({
            name: '黃金少年',
            kind: 'series',
            enabled: true,
            arcUnit: 'season',
        });
    });

    it('holds 4 seasons of 35 / 30 / 30 / 31 episodes, all newly added', () => {
        expect([...new Set(golden.map((e) => e.arc))]).toEqual(SEASONS.map((n) => `Season ${n}`));
        expect(SEASONS.map((n) => inSeason(n).length)).toEqual([35, 30, 30, 31]);
        expect(golden.every((e) => e.addedAt === '2026-10-24')).toBe(true);
        SEASONS.forEach((n) =>
            expect(inSeason(n).map((e) => e.no)).toEqual(inSeason(n).map((_, i) => i + 1)),
        );
    });

    it('builds the R2 url with no space between the name and Season', () => {
        expect(decodeURIComponent(inSeason(1)[0]?.url ?? '')).toBe(
            `${R2_GOLDEN}/Season 1/01 - 黃金少年Season 1 - 第一集.m4a`,
        );
        expect(inSeason(1)[0]?.title).toBeUndefined();
        expect(decodeURIComponent(inSeason(3)[29]?.url ?? '')).toBe(
            `${R2_GOLDEN}/Season 3/30 - 黃金少年Season 3 - 第三十集.m4a`,
        );
        expect(inSeason(1)[0]?.url).toContain('%E9%BB%83%E9%87%91%E5%B0%91%E5%B9%B4/Season%201/');
    });

    it('titles only the finale, 最終結局', () => {
        const finale = inSeason(4)[30];
        expect(finale).toMatchObject({ no: 31, title: '最終結局' });
        expect(decodeURIComponent(finale?.url ?? '')).toBe(
            `${R2_GOLDEN}/Season 4/31 - 黃金少年Season 4 - 第三十一集 - 最終結局.m4a`,
        );
        expect(golden.filter((e) => e.title)).toHaveLength(1);
    });

    describe('per-season disc art', () => {
        it('gives every season its own disc, none of them the series disc', () => {
            const discs = SEASONS.map((n) => inSeason(n)[0]).map((e) => e && dramaArtFor(e));
            expect(discs.every(Boolean)).toBe(true);
            expect(new Set(discs).size).toBe(SEASONS.length);
            expect(discs).not.toContain(findDrama('golden')?.theme.art);
        });

        it('themes a playing episode with the drama colours and the season disc', () => {
            const s2 = inSeason(2)[0];
            if (!s2) throw new Error('missing fixture');
            const theme = dramaEpisodeTheme(s2);
            expect(theme.art).toBe(dramaArtFor(s2));
            expect(theme.art).not.toBe(findDrama('golden')?.theme.art);
            expect(theme.bg).toBe(findDrama('golden')?.theme.bg);
        });

        it('falls back to the drama disc for a season without its own cover', () => {
            const s2 = inSeason(2)[0];
            if (!s2) throw new Error('missing fixture');
            const art = dramaArtFor({ ...s2, arc: 'Season 5' });
            expect(art).toBe(findDrama('golden')?.theme.art);
            expect(art).not.toBe(dramaArtFor(s2));
        });
    });
});
