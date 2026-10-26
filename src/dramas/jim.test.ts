/* 少爺占系列 regression：集數 / URL 必須同 R2 檔名一樣（URL 係已儲進度嘅 key），每個短篇有自己碟面 */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import { dramaArtFor, dramaEpisodeTheme, findDrama, seriesEpisodesOf } from './index';

const R2_JIM = `${DRAMA_AUDIO_BASE}/少爺占系列`;
const ARCS: ReadonlyArray<readonly [string, number]> = [
    ['八王子', 21],
    ['忠孝公路', 17],
];
const ADDED_AT = '2026-10-26';
/** 用戶畀嘅 sample link，一個 byte 都唔可以差 */
const SAMPLE_URL =
    'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/%E5%B0%91%E7%88%BA%E5%8D%A0%E7%B3%BB%E5%88%97/%E5%85%AB%E7%8E%8B%E5%AD%90/01%20-%20%E5%85%AB%E7%8E%8B%E5%AD%90%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86.m4a';

describe('少爺占系列', () => {
    const jim = seriesEpisodesOf('jim');
    const inArc = (name: string) => jim.filter((e) => e.arc === name);

    it('is an enabled series drama counted in arcs', () => {
        expect(findDrama('jim')).toMatchObject({
            name: '少爺占系列',
            kind: 'series',
            enabled: true,
        });
        expect(findDrama('jim')?.arcUnit).toBeUndefined();
    });

    it('holds 2 arcs of 21 / 17 episodes, all newly added', () => {
        expect([...new Set(jim.map((e) => e.arc))]).toEqual(ARCS.map(([name]) => name));
        expect(ARCS.map(([name]) => inArc(name).length)).toEqual(ARCS.map(([, n]) => n));
        expect(jim.every((e) => e.addedAt === ADDED_AT)).toBe(true);
        ARCS.forEach(([name]) =>
            expect(inArc(name).map((e) => e.no)).toEqual(inArc(name).map((_, i) => i + 1)),
        );
    });

    it('builds the R2 url exactly like the sample link', () => {
        expect(inArc('八王子')[0]?.url).toBe(SAMPLE_URL);
        expect(decodeURIComponent(inArc('忠孝公路')[16]?.url ?? '')).toBe(
            `${R2_JIM}/忠孝公路/17 - 忠孝公路 - 第十七集.m4a`,
        );
        expect(jim.every((e) => e.title === undefined)).toBe(true);
    });

    describe('per-arc disc art', () => {
        it('gives every arc its own disc, none of them the drama disc', () => {
            const discs = ARCS.map(([name]) => inArc(name)[0]).map((e) => e && dramaArtFor(e));
            expect(discs.every(Boolean)).toBe(true);
            expect(new Set(discs).size).toBe(ARCS.length);
            expect(discs).not.toContain(findDrama('jim')?.theme.art);
        });

        it('themes a playing episode with the drama colours and the arc disc', () => {
            const first = inArc('八王子')[0];
            if (!first) throw new Error('missing fixture');
            const theme = dramaEpisodeTheme(first);
            expect(theme.art).toBe(dramaArtFor(first));
            expect(theme.bg).toBe(findDrama('jim')?.theme.bg);
        });
    });
});
