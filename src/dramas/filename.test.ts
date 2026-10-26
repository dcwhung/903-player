import { displayTitle, encodePath, renderFileName, toChineseNumeral } from './filename';

describe('renderFileName', () => {
    const SERIES_TEMPLATE = '{no2} - {arc} - 第{noZh}集[ - {title}].m4a';

    it('substitutes every token', () => {
        expect(
            renderFileName(SERIES_TEMPLATE, {
                no2: '04',
                arc: 'Ｘ時mas時小提議',
                noZh: '四',
                title: '認認真真搵返個人',
            }),
        ).toBe('04 - Ｘ時mas時小提議 - 第四集 - 認認真真搵返個人.m4a');
    });

    it('drops an optional group when a token inside it is empty', () => {
        expect(
            renderFileName(SERIES_TEMPLATE, { no2: '01', arc: '青春期', noZh: '一', title: '' }),
        ).toBe('01 - 青春期 - 第一集.m4a');
    });

    it('keeps literal text inside an optional group whose tokens are all set', () => {
        expect(renderFileName('{a}[ ({b})]', { a: 'x', b: 'y' })).toBe('x (y)');
    });

    it('renders a template without any optional group', () => {
        expect(renderFileName('{yyyymmdd}.m4a', { yyyymmdd: '20261023' })).toBe('20261023.m4a');
    });

    it('throws on a token the caller did not supply', () => {
        expect(() => renderFileName('{no2} - {season}.m4a', { no2: '01' })).toThrow(
            'unknown token {season}',
        );
    });

    it('lets a token value contain braces or brackets without re-expanding them', () => {
        expect(renderFileName('{title}', { title: 'a [b] {c}' })).toBe('a [b] {c}');
        expect(renderFileName('x[ - {title}]', { title: '{no2}' })).toBe('x - {no2}');
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

describe('displayTitle', () => {
    it('swaps the file-name separator for 「：」 and trims', () => {
        expect(displayTitle(' 瞞天過海 _ 隠形墨水筆 ')).toBe('瞞天過海：隠形墨水筆');
    });

    it('leaves a plain title alone', () => {
        expect(displayTitle('前傳')).toBe('前傳');
    });
});

describe('encodePath', () => {
    it('encodes each segment separately and joins with /', () => {
        expect(encodePath(['芝See菇Bi Family', 'Ｘ時mas時小提議', '01 - a.m4a'])).toBe(
            `${encodeURIComponent('芝See菇Bi Family')}/${encodeURIComponent('Ｘ時mas時小提議')}/01%20-%20a.m4a`,
        );
    });
});
