/* 蘭茜夫人劇場 regression：集數 / URL 必須同 R2 檔名一樣（URL 係已儲進度嘅 key），每個短篇有自己碟面 */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import { dramaArtFor, dramaEpisodeTheme, findDrama, seriesEpisodesOf } from './index';

const R2_LANCY = `${DRAMA_AUDIO_BASE}/蘭茜夫人劇場`;
const ARCS: ReadonlyArray<readonly [string, number]> = [
    ['戀愛二分一', 30],
    ['初戀無限次', 33],
    ['我心不死', 37],
];
const ADDED_AT = '2026-10-27';
/** 用戶畀嘅 sample link，一個 byte 都唔可以差 */
const SAMPLE_URL =
    'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev/%E8%98%AD%E8%8C%9C%E5%A4%AB%E4%BA%BA%E5%8A%87%E5%A0%B4/%E5%88%9D%E6%88%80%E7%84%A1%E9%99%90%E6%AC%A1/01%20-%20%E5%88%9D%E6%88%80%E7%84%A1%E9%99%90%E6%AC%A1%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86.m4a';

describe('蘭茜夫人劇場', () => {
    const lancy = seriesEpisodesOf('lancy');
    const inArc = (name: string) => lancy.filter((e) => e.arc === name);

    it('is an enabled series drama counted in arcs', () => {
        expect(findDrama('lancy')).toMatchObject({
            name: '蘭茜夫人劇場',
            kind: 'series',
            enabled: true,
            addedAt: ADDED_AT,
        });
        expect(findDrama('lancy')?.arcUnit).toBeUndefined();
    });

    it('holds 3 arcs of 30 / 33 / 37 episodes, all newly added', () => {
        expect([...new Set(lancy.map((e) => e.arc))]).toEqual(ARCS.map(([name]) => name));
        expect(ARCS.map(([name]) => inArc(name).length)).toEqual(ARCS.map(([, n]) => n));
        expect(lancy.every((e) => e.addedAt === ADDED_AT)).toBe(true);
        ARCS.forEach(([name]) =>
            expect(inArc(name).map((e) => e.no)).toEqual(inArc(name).map((_, i) => i + 1)),
        );
    });

    it('builds the R2 url exactly like the sample link', () => {
        expect(inArc('初戀無限次')[0]?.url).toBe(SAMPLE_URL);
        expect(decodeURIComponent(inArc('戀愛二分一')[29]?.url ?? '')).toBe(
            `${R2_LANCY}/戀愛二分一/30 - 戀愛二分一 - 第三十集.m4a`,
        );
        expect(decodeURIComponent(inArc('我心不死')[36]?.url ?? '')).toBe(
            `${R2_LANCY}/我心不死/37 - 我心不死 - 第三十七集.m4a`,
        );
        expect(lancy.every((e) => e.title === undefined)).toBe(true);
    });

    describe('per-arc disc art', () => {
        it('gives every arc its own disc, none of them the drama disc', () => {
            const discs = ARCS.map(([name]) => inArc(name)[0]).map((e) => e && dramaArtFor(e));
            expect(discs.every(Boolean)).toBe(true);
            expect(new Set(discs).size).toBe(ARCS.length);
            expect(discs).not.toContain(findDrama('lancy')?.theme.art);
        });

        it('themes a playing episode with the drama colours and the arc disc', () => {
            const first = inArc('戀愛二分一')[0];
            if (!first) throw new Error('missing fixture');
            const theme = dramaEpisodeTheme(first);
            expect(theme.art).toBe(dramaArtFor(first));
            expect(theme.bg).toBe(findDrama('lancy')?.theme.bg);
        });
    });
});
