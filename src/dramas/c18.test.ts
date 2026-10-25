/* 18 樓 C 座 regression：⚠️ 仲係假資料、停用中；URL 係 app 自己 host 嘅佔位 */
import {
    dailyEpisodesOf,
    dramaArtFor,
    findDrama,
    findEnabledDrama,
    seriesEpisodesOf,
} from './index';

describe('18 樓 C 座', () => {
    const episodes = dailyEpisodesOf('c18');

    it('is a daily drama that stays configured but switched off', () => {
        expect(findDrama('c18')).toMatchObject({
            name: '18 樓 C 座',
            kind: 'daily',
            enabled: false,
        });
        expect(findEnabledDrama('c18')).toBeUndefined();
        expect(seriesEpisodesOf('c18')).toEqual([]);
    });

    it('lists the dated episodes with 2025-08 marked as reruns', () => {
        expect(episodes.map((e) => e.date)).toEqual([
            '2026-10-23',
            '2026-10-22',
            '2026-10-21',
            '2026-10-20',
            '2026-10-16',
            '2026-10-15',
            '2025-08-13',
            '2025-08-12',
            '2025-08-11',
        ]);
        expect(episodes.filter((e) => e.rerun).map((e) => e.date)).toEqual([
            '2025-08-13',
            '2025-08-12',
            '2025-08-11',
        ]);
    });

    it('points at the app-hosted placeholder url, BASE_URL/dramas/c18/<yyyymmdd>.m4a', () => {
        expect(episodes[0]?.url).toBe(`${import.meta.env.BASE_URL}dramas/c18/20261023.m4a`);
    });

    it('uses the drama disc for every episode and a serif title font', () => {
        expect(new Set(episodes.map(dramaArtFor))).toEqual(new Set([findDrama('c18')?.theme.art]));
        expect(findDrama('c18')?.theme.titleFont).toContain('Noto Serif TC');
    });
});
