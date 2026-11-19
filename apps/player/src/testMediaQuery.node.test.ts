// @vitest-environment node
// tests/mediaQuery.ts：鎖定測試（deviceQueries）同 matchMedia stub（tests/landscape.ts）嘅判斷基準，
// 自己都要鎖住同 CSS Media Queries 規格一樣（S-1119）
import { matchesQuery } from '../tests/mediaQuery';

describe('matchesQuery', () => {
    it.each([
        ['闊 > 高係 landscape', '(orientation: landscape)', { width: 2, height: 1 }, true],
        ['正方形當 portrait', '(orientation: portrait)', { width: 5, height: 5 }, true],
        ['正方形唔係 landscape', '(orientation: landscape)', { width: 5, height: 5 }, false],
        ['min-width 包埋邊界', '(min-width: 640px)', { width: 640, height: 1 }, true],
        ['min-width 差 1px', '(min-width: 640px)', { width: 639, height: 1 }, false],
        ['max-width 包埋邊界', '(max-width: 639px)', { width: 639, height: 1 }, true],
        ['max-width 多 1px', '(max-width: 639px)', { width: 640, height: 1 }, false],
        ['min-height 包埋邊界', '(min-height: 562px)', { width: 1, height: 562 }, true],
        ['max-height 包埋邊界', '(max-height: 561px)', { width: 1, height: 561 }, true],
        ['max-height 多 1px', '(max-height: 561px)', { width: 1, height: 562 }, false],
    ])('%s', (_name, query, viewport, expected) => {
        expect(matchesQuery(query, viewport)).toBe(expected);
    });

    it('and：全部要中', () => {
        const query = '(orientation: landscape) and (min-width: 640px) and (max-height: 561px)';

        expect(matchesQuery(query, { width: 844, height: 390 })).toBe(true);
        expect(matchesQuery(query, { width: 844, height: 600 })).toBe(false);
        expect(matchesQuery(query, { width: 612, height: 390 })).toBe(false);
    });

    it('逗號：中一個就得', () => {
        const query = '(min-width: 1000px), (max-width: 400px)';

        expect(matchesQuery(query, { width: 390, height: 1 })).toBe(true);
        expect(matchesQuery(query, { width: 1200, height: 1 })).toBe(true);
        expect(matchesQuery(query, { width: 600, height: 1 })).toBe(false);
    });

    it.each(['(hover: hover)', '(min-width: 40em)', '(orientation: sideways)', 'screen'])(
        '唔識嘅寫法 %s：throw，唔會靜靜雞當中 / 唔中',
        (query) => {
            expect(() => matchesQuery(query, { width: 1, height: 1 })).toThrow();
        },
    );
});
