import { DRAMAS } from '../config/dramas';
import {
    dailyEpisodesOf,
    dramaEpisodesOf,
    seriesEpisodesOf,
    toChineseNumeral,
} from './dramaCatalog';

const R2_CHISEE = 'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/芝See菇Bi Family';

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

    it('numbers the series episodes consecutively within each arc, from 1 (or 0 with a 前傳)', () => {
        const episodes = seriesEpisodesOf('chisee');
        const arcs = new Set(episodes.map((e) => e.arc));
        arcs.forEach((arc) => {
            const numbers = episodes.filter((e) => e.arc === arc).map((e) => e.no);
            const first = arc === '初戀嗱喳麵' ? 0 : 1;
            expect(numbers).toEqual(numbers.map((_, i) => i + first));
        });
    });

    it('only hands out episodes of the matching kind', () => {
        expect(seriesEpisodesOf('c18')).toEqual([]);
        expect(dailyEpisodesOf('chisee')).toEqual([]);
        expect(dailyEpisodesOf('c18').some((e) => e.rerun)).toBe(true);
    });

    it('holds the full 芝See list: 12 短篇, 97 episodes, titles only where the file has one', () => {
        const episodes = seriesEpisodesOf('chisee');
        expect(episodes).toHaveLength(97);
        expect([...new Set(episodes.map((e) => e.arc))]).toEqual([
            '三十六計',
            '你生日所以我生日',
            '初戀嗱喳麵',
            '大妒忌',
            '好朋友手牽手',
            '小苦妹撲水',
            '我們都在會考中成長',
            '游亁水',
            '苦榮去做GYM',
            '青春期',
            '青春期眞神奇',
            'Ｘ時mas時小提議',
        ]);
        const first = episodes.find((e) => e.arc === '你生日所以我生日');
        expect(first?.title).toBeUndefined();
        expect(first?.url).toMatch(/%E7%AC%AC%E4%B8%80%E9%9B%86\.m4a$/);
        const lastOld = episodes.find((e) => e.arc === 'Ｘ時mas時小提議' && e.no === 4);
        expect(lastOld).toMatchObject({ title: '認認真真搵返個人' });
        expect(decodeURIComponent(lastOld?.url ?? '')).toBe(
            `${R2_CHISEE}/Ｘ時mas時小提議/04 - Ｘ時mas時小提議 - 第四集 - 認認真真搵返個人.m4a`,
        );
    });

    it('builds the R2 url of the 游亁水 sample, under the renamed 芝See菇Bi Family folder', () => {
        const first = seriesEpisodesOf('chisee').find((e) => e.arc === '游亁水');
        expect(first?.url).toBe(
            'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/%E8%8A%9DSee%E8%8F%87Bi%20Family/%E6%B8%B8%E4%BA%81%E6%B0%B4/01%20-%20%E6%B8%B8%E4%BA%81%E6%B0%B4%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86.m4a',
        );
    });

    it('adds 三十六計 as a new 短篇 of 36 episodes, built from the original file names', () => {
        const arc = seriesEpisodesOf('chisee').filter((e) => e.arc === '三十六計');
        expect(arc).toHaveLength(36);
        expect(arc.every((e) => e.addedAt === '2026-10-24')).toBe(true);
        const fileOf = (no: number): string =>
            decodeURIComponent(arc[no - 1]?.url ?? '').replace(`${R2_CHISEE}/三十六計/`, '');
        expect(fileOf(1)).toBe('01 - 三十六計 - 第一集 - 瞞天過海 _ 隠形墨水筆.m4a');
        expect(fileOf(10)).toBe('10 - 三十六計 - 第十集 - 以逸待勞 _ 智取亞生成績表.m4a');
        expect(fileOf(14)).toBe('14 - 三十六計 - 第十四集 - 借屍還魂 _ 男女互氹大比賽.m4a');
        expect(fileOf(17)).toBe('17 - 三十六計 - 第十七集 - 美人計 _ 小姐你係邊位？.m4a');
        expect(fileOf(36)).toBe(
            '36 - 三十六計 - 第三十六集 - 偷樑換柱 + 金蟬脫殼 + 擒賊擒王 _ 完美的結局.m4a',
        );
    });

    it('shows 三十六計 titles with 「：」 in place of the file-name 「 _ 」', () => {
        const arc = seriesEpisodesOf('chisee').filter((e) => e.arc === '三十六計');
        expect(arc[0]?.title).toBe('瞞天過海：隠形墨水筆');
        expect(arc[16]?.title).toBe('美人計：小姐你係邊位？');
    });
    it('adds 初戀嗱喳麵: 第零集 前傳, 第一 … 二十集, then 後傳 1–5', () => {
        const arc = seriesEpisodesOf('chisee').filter((e) => e.arc === '初戀嗱喳麵');
        expect(arc).toHaveLength(26);
        expect(arc.map((e) => e.no)).toEqual(arc.map((_, i) => i));
        expect(arc.every((e) => e.addedAt === '2026-10-25')).toBe(true);
        expect(arc[0]?.title).toBe('前傳');
        expect(arc[1]?.title).toBeUndefined();
        expect(arc[25]?.title).toBe('後傳5');
        const fileOf = (i: number): string =>
            decodeURIComponent(arc[i]?.url ?? '').replace(`${R2_CHISEE}/初戀嗱喳麵/`, '');
        expect(fileOf(0)).toBe('00 - 初戀嗱喳麵 - 第零集 - 前傳.m4a');
        expect(fileOf(1)).toBe('01 - 初戀嗱喳麵 - 第一集.m4a');
        expect(fileOf(20)).toBe('20 - 初戀嗱喳麵 - 第二十集.m4a');
        expect(fileOf(21)).toBe('21 - 初戀嗱喳麵 - 第二十一集 - 後傳1.m4a');
    });
});

describe('toChineseNumeral', () => {
    it.each([
        [0, '零'],
        [1, '一'],
        [4, '四'],
        [10, '十'],
        [11, '十一'],
        [20, '二十'],
        [21, '二十一'],
        [36, '三十六'],
    ])('%i → %s', (n, expected) => {
        expect(toChineseNumeral(n)).toBe(expected);
    });
});
