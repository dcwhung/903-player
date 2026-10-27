/* 森美小儀系列 regression：集數 / URL 必須同 R2 檔名一樣（URL 係已儲進度嘅 key），每個短篇有自己碟面 */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import { dramaArtFor, dramaEpisodeTheme, findDrama, seriesEpisodesOf } from './index';

const R2_SAMMY = `${DRAMA_AUDIO_BASE}/森美小儀系列`;
/** R2 folder 名 → 集數 */
const ARCS: ReadonlyArray<readonly [string, number]> = [
    ['來不及聽你說愛我', 10],
    ['公子森林', 40],
    ['十九樓半的夏天', 10],
    ['森之愛情I - 森之聖誕', 10],
    ['森之愛情II - 電燈膽', 9],
    ['森之聖誕2010', 15],
    ['森美幻想劇', 15],
];
const ADDED_AT = '2026-10-26';
const XMAS_2010_TITLES = [
    '不會飛走的氣球',
    '你在世界那邊',
    '不死心',
    '我的公園女王',
    '愛情狗仔隊',
    '斯德哥爾摩症候群',
    '提神咖啡',
    '兒嬉愛情',
    '我的家',
    '我的主診醫生',
    '聖誕小屋',
    '聖誕再造爸爸',
    '兩個男人',
    '聖誕村',
    '愛情保險',
];
/** 公子森林集名（R2 已改名，檔名帶集名） */
const FOREST_TITLES = [
    '秘撈',
    '兩個危機',
    '選擇困難',
    '愛屋及烏',
    '童年',
    '單純',
    '文藝青年神經',
    '教科書與八卦雜誌',
    '經常性男性幻想',
    '踩單車愛情論',
    '信不信緣份',
    '楊過與小龍女',
    '講大話的藝術',
    '攞著數',
    '愛情二五仔',
    '理智不理智',
    '傑仔崩潰',
    '真相大白',
    '整定',
    '約定',
    '開心防衛系統',
    '齊人之福',
    '重回單身',
    '袋鼠死的疑問',
    '上天堂',
    '冷戰',
    '空櫃桶',
    'Mama的秘密',
    'Mama的故事',
    '薰衣草味道',
    'Lavender走了',
    '白海娟的決定',
    '兩張紙巾',
    'Sandra & Mama',
    '浪費的愛情',
    'Sandra BB',
    '悼念',
    '再見',
    '大結局？',
    'Fly me to the moon',
];
/** 森之愛情I 集名（R2 已改名，檔名帶集名） */
const LOVE_1_TITLES = [
    '我的病人',
    '十年後的答案',
    '兩個人的聖誕',
    '我愛土瓜灣',
    '滿天星',
    'My Cup Of Coffee',
    '我好愛你',
    '45度的Bunny',
    '想愛不相愛',
    'Magic Eleven',
];
/** 用戶畀嘅 sample link（每集檔名都帶集名） */
const XMAS_2010_SAMPLE_URL =
    'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/%E6%A3%AE%E7%BE%8E%E5%B0%8F%E5%84%80%E7%B3%BB%E5%88%97/%E6%A3%AE%E4%B9%8B%E8%81%96%E8%AA%952010/01%20-%20%E6%A3%AE%E4%B9%8B%E8%81%96%E8%AA%952010%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86%20-%20%E4%B8%8D%E6%9C%83%E9%A3%9B%E8%B5%B0%E7%9A%84%E6%B0%A3%E7%90%83.m4a';
/** 用戶畀嘅 sample link，一個 byte 都唔可以差 */
const SAMPLE_URL =
    'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/%E6%A3%AE%E7%BE%8E%E5%B0%8F%E5%84%80%E7%B3%BB%E5%88%97/%E4%BE%86%E4%B8%8D%E5%8F%8A%E8%81%BD%E4%BD%A0%E8%AA%AA%E6%84%9B%E6%88%91/01%20-%20%E4%BE%86%E4%B8%8D%E5%8F%8A%E8%81%BD%E4%BD%A0%E8%AA%AA%E6%84%9B%E6%88%91%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86.m4a';

describe('森美小儀系列', () => {
    const sammy = seriesEpisodesOf('sammy-kitty');
    const inArc = (name: string) => sammy.filter((e) => e.arc === name);

    it('is an enabled series drama counted in arcs', () => {
        expect(findDrama('sammy-kitty')).toMatchObject({
            name: '森美小儀系列',
            kind: 'series',
            enabled: true,
        });
        expect(findDrama('sammy-kitty')?.arcUnit).toBeUndefined();
    });

    it('holds 7 arcs of 10 / 40 / 10 / 10 / 9 / 15 / 15 episodes, all newly added', () => {
        expect([...new Set(sammy.map((e) => e.arc))]).toEqual(ARCS.map(([name]) => name));
        expect(ARCS.map(([name]) => inArc(name).length)).toEqual(ARCS.map(([, n]) => n));
        expect(sammy.every((e) => e.addedAt === ADDED_AT)).toBe(true);
        ARCS.forEach(([name]) =>
            expect(inArc(name).map((e) => e.no)).toEqual(inArc(name).map((_, i) => i + 1)),
        );
    });

    it('builds the R2 url exactly like the sample link', () => {
        expect(inArc('來不及聽你說愛我')[0]?.url).toBe(SAMPLE_URL);
        expect(decodeURIComponent(inArc('公子森林')[39]?.url ?? '')).toBe(
            `${R2_SAMMY}/公子森林/40 - 公子森林 - 第四十集 - Fly me to the moon.m4a`,
        );
        expect(sammy.filter((e) => e.title)).toHaveLength(15 + 40 + 10);
    });

    it('spells 森之愛情II with ASCII II, as renamed on R2 (the Roman numeral Ⅱ U+2161 now 404s)', () => {
        const first = inArc('森之愛情II - 電燈膽')[0];
        expect(decodeURIComponent(first?.url ?? '')).toBe(
            `${R2_SAMMY}/森之愛情II - 電燈膽/01 - 森之愛情II - 電燈膽 - 第一集.m4a`,
        );
        expect(first?.url).toContain('%E6%A3%AE%E4%B9%8B%E6%84%9B%E6%83%85II%20-%20');
        expect(sammy.some((e) => e.url.includes('%E2%85%A1'))).toBe(false);
        expect(decodeURIComponent(inArc('森之愛情I - 森之聖誕')[0]?.url ?? '')).toBe(
            `${R2_SAMMY}/森之愛情I - 森之聖誕/01 - 森之愛情I - 森之聖誕 - 第一集 - 我的病人.m4a`,
        );
    });

    it('titles every 公子森林 episode from the renamed R2 file name', () => {
        const forest = inArc('公子森林');
        expect(forest.map((e) => e.title)).toEqual(FOREST_TITLES);
        expect(decodeURIComponent(forest[0]?.url ?? '')).toBe(
            `${R2_SAMMY}/公子森林/01 - 公子森林 - 第一集 - 秘撈.m4a`,
        );
    });

    it('titles every 森之愛情I episode from the renamed R2 file name', () => {
        const love = inArc('森之愛情I - 森之聖誕');
        expect(love.map((e) => e.title)).toEqual(LOVE_1_TITLES);
        expect(decodeURIComponent(love[9]?.url ?? '')).toBe(
            `${R2_SAMMY}/森之愛情I - 森之聖誕/10 - 森之愛情I - 森之聖誕 - 第十集 - Magic Eleven.m4a`,
        );
    });

    it('titles every 森之聖誕2010 episode from the R2 file name', () => {
        const xmas = inArc('森之聖誕2010');
        expect(xmas.map((e) => e.title)).toEqual(XMAS_2010_TITLES);
        expect(decodeURIComponent(xmas[0]?.url ?? '')).toBe(
            `${R2_SAMMY}/森之聖誕2010/01 - 森之聖誕2010 - 第一集 - 不會飛走的氣球.m4a`,
        );
        expect(xmas[0]?.url).toBe(XMAS_2010_SAMPLE_URL);
    });

    describe('per-arc disc art', () => {
        it('gives every arc its own disc, none of them the drama disc', () => {
            const discs = ARCS.map(([name]) => inArc(name)[0]).map((e) => e && dramaArtFor(e));
            expect(discs.every(Boolean)).toBe(true);
            expect(new Set(discs).size).toBe(ARCS.length);
            expect(discs).not.toContain(findDrama('sammy-kitty')?.theme.art);
        });

        it('themes a playing episode with the drama colours and the arc disc', () => {
            const forest = inArc('公子森林')[0];
            if (!forest) throw new Error('missing fixture');
            const theme = dramaEpisodeTheme(forest);
            expect(theme.art).toBe(dramaArtFor(forest));
            expect(theme.bg).toBe(findDrama('sammy-kitty')?.theme.bg);
        });
    });
});
