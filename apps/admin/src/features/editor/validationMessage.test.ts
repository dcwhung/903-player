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

    it('should explain a schedule whose unlist date is not after the listing date', () => {
        expect(
            validationMessage(
                'episode 6 unlist date 2026-11-16 must be later than its listing date 2026-11-23',
            ),
        ).toBe('第 6 集的下架日期（16/11 一）必須遲於其上架日期（23/11 一），請修改下架設定。');
    });

    it('should explain an unlist date before today (W-715)', () => {
        expect(
            validationMessage('episode 1 unlist date 2026-08-30 is before today 2026-11-12'),
        ).toBe('第 1 集的下架日期（30/8 日）早於今日，請修改下架設定。');
    });

    it('should explain an episode range whose unlist date is before today (S-843)', () => {
        expect(
            validationMessage('episodes 1-10 unlist date 2026-08-30 is before today 2026-11-12'),
        ).toBe('第 1–10 集的下架日期（30/8 日）早於今日，請修改下架設定。');
    });

    it('should return null for errors it does not know', () => {
        expect(validationMessage('dramas/golden: audio.file: unknown token {x}')).toBeNull();
        expect(validationMessage('something else')).toBeNull();
    });
});
