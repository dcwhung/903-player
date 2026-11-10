import { formatTitles, parseTitles } from './episodeTitles';

describe('formatTitles', () => {
    it('should write one line per episode, leaving untitled episodes blank after the bar', () => {
        const arc = { episodes: 3, titles: { '2': '初次見面' } };
        expect(formatTitles(arc)).toBe('第 1 集 ｜ \n第 2 集 ｜ 初次見面\n第 3 集 ｜ ');
    });

    it('should read titles from an episodes list, honouring firstNo, with titles winning', () => {
        const arc = {
            name: 'A',
            firstNo: 0,
            episodes: ['前傳', null, '舊'],
            titles: { '2': '新' },
        };
        expect(formatTitles(arc)).toBe('第 0 集 ｜ 前傳\n第 1 集 ｜ \n第 2 集 ｜ 新');
    });

    it('should give an empty text when the episode count is unknown', () => {
        expect(formatTitles({})).toBe('');
    });
});

describe('parseTitles', () => {
    it('should round-trip formatTitles', () => {
        const text = formatTitles({ episodes: 3, titles: { '2': '初次見面' } });
        expect(parseTitles(text, 1, 3)).toEqual({ titles: { '2': '初次見面' }, errors: [] });
    });

    it('should accept a half-width bar, extra spaces, a missing bar and blank lines', () => {
        const text = '第1集|甲\n\n  第 2 集   ｜   乙  \n第 3 集\n';
        expect(parseTitles(text, 1, 3)).toEqual({ titles: { '1': '甲', '2': '乙' }, errors: [] });
    });

    it('should report line-level errors: bad format, out of range, duplicate', () => {
        const text = [
            '第 1 集 ｜ 甲',
            '一 ｜ 乙',
            '第 9 集 ｜ 丙',
            '第 1 集 ｜ 丁',
            '第 0 集 ｜ 戊',
        ].join('\n');
        const { titles, errors } = parseTitles(text, 1, 3);
        expect(titles).toEqual({ '1': '甲' });
        expect(errors).toEqual([
            { line: 2, kind: 'format', message: '第 2 行：格式要係「第 X 集 ｜ 標題」' },
            { line: 3, kind: 'range', message: '第 3 行：第 9 集超出範圍（第 1–3 集）' },
            { line: 4, kind: 'duplicate', message: '第 4 行：第 1 集重複（第 1 行已經有）' },
            { line: 5, kind: 'range', message: '第 5 行：第 0 集超出範圍（第 1–3 集）' },
        ]);
    });

    it('should treat every episode as out of range when the count is zero', () => {
        expect(parseTitles('第 1 集 ｜ 甲', 1, 0).errors.map((e) => e.kind)).toEqual(['range']);
    });
});
