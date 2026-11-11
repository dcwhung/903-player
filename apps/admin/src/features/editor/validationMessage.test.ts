import { validationMessage } from './validationMessage';

describe('validationMessage', () => {
    it.each([
        [
            'shows/abc: tile: no file tile.webp in the folder',
            '節目「abc」未有 Banner 圖片，請先上載。',
        ],
        ['shows/abc: disc: no file disc.webp in the folder', '節目「abc」未有碟面圖片，請先上載。'],
        [
            'dramas/golden: disc: no file disc.webp in the folder',
            '廣播劇「golden」未有碟面圖片，請先上載。',
        ],
        [
            'dramas/golden: arcs[1].disc: no file arcs/s2/disc.webp in the folder',
            '廣播劇「golden」第 2 個短篇未有碟面圖片，請先上載。',
        ],
        ['shows/abc: name must be a non-empty string', '節目「abc」的「名稱」不可留空。'],
        ['shows/abc: fileTime must be a non-empty string', '節目「abc」的「錄音檔時間」不可留空。'],
        ['shows/abc: airDays[0] must be a weekday 0–6', '節目「abc」的「播出日」無效。'],
        [
            'dramas/golden: arcs[0].id: duplicate arc id season-1',
            '廣播劇「golden」有重複的短篇 ID「season-1」。',
        ],
        [
            'dramas/golden: arcs[0].addedAt must be a YYYY-MM-DD date',
            '廣播劇「golden」第 1 個短篇的上架日期格式不正確。',
        ],
    ])('should explain %s', (detail, message) => {
        expect(validationMessage(detail)).toBe(message);
    });

    it('should return null for errors it does not know', () => {
        expect(validationMessage('dramas/golden: audio.file: unknown token {x}')).toBeNull();
        expect(validationMessage('something else')).toBeNull();
    });
});
