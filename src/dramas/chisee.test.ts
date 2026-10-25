/* 芝See菇Bi Family regression：集數 / URL 必須同 R2 檔名一樣（URL 係已儲進度嘅 key） */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import { dailyEpisodesOf, dramaArtFor, findDrama, seriesEpisodesOf } from './index';

const R2_CHISEE = `${DRAMA_AUDIO_BASE}/芝See菇Bi Family`;

describe('芝See菇Bi Family', () => {
    const episodes = seriesEpisodesOf('chisee');

    it('is an enabled series drama counted in 短篇, with a single disc for every arc', () => {
        expect(findDrama('chisee')).toMatchObject({
            name: '芝See菇Bi Family',
            kind: 'series',
            enabled: true,
        });
        expect(findDrama('chisee')?.arcUnit).toBeUndefined();
        expect(dailyEpisodesOf('chisee')).toEqual([]);
        const discs = new Set(episodes.map(dramaArtFor));
        expect(discs.size).toBe(1);
        expect([...discs][0]).toBe(findDrama('chisee')?.theme.art);
    });

    it('holds the full list: 12 短篇, 97 episodes, titles only where the file has one', () => {
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

    it('numbers the episodes consecutively within each arc, from 1 (or 0 with a 前傳)', () => {
        const arcs = new Set(episodes.map((e) => e.arc));
        arcs.forEach((arc) => {
            const numbers = episodes.filter((e) => e.arc === arc).map((e) => e.no);
            const first = arc === '初戀嗱喳麵' ? 0 : 1;
            expect(numbers).toEqual(numbers.map((_, i) => i + first));
        });
    });

    it('builds the exact encoded R2 url of the 游亁水 sample', () => {
        const first = episodes.find((e) => e.arc === '游亁水');
        expect(first?.url).toBe(
            'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/%E8%8A%9DSee%E8%8F%87Bi%20Family/%E6%B8%B8%E4%BA%81%E6%B0%B4/01%20-%20%E6%B8%B8%E4%BA%81%E6%B0%B4%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86.m4a',
        );
    });

    it('keeps 三十六計 as a 36-episode 短篇 built from the original file names', () => {
        const arc = episodes.filter((e) => e.arc === '三十六計');
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
        expect(arc[0]?.title).toBe('瞞天過海：隠形墨水筆');
        expect(arc[16]?.title).toBe('美人計：小姐你係邊位？');
    });

    it('keeps 初戀嗱喳麵: 第零集 前傳, 第一 … 二十集, then 後傳 1–5', () => {
        const arc = episodes.filter((e) => e.arc === '初戀嗱喳麵');
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

    it('leaves the old 10 短篇 without addedAt, so they never read as 新', () => {
        const old = episodes.filter((e) => !['三十六計', '初戀嗱喳麵'].includes(e.arc));
        expect(old.length).toBe(97 - 36 - 26);
        expect(old.every((e) => e.addedAt === undefined)).toBe(true);
    });
});
