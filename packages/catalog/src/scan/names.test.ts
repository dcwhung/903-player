import { byteOrder, findSuspicious, parseEpisodeFileName, parseEpisodeNumeral } from './names';
import { toChineseNumeral } from '../dramas/filename';
import { range } from './testListing';

const NFD_NAME = 'Café'.normalize('NFD');

describe('toChineseNumeral / parseEpisodeNumeral', () => {
    it('should round-trip every episode number from 0 to 99', () => {
        range(0, 99).forEach((n) => expect(parseEpisodeNumeral(toChineseNumeral(n))).toBe(n));
    });

    it('should accept arabic digits and reject nonsense', () => {
        expect(parseEpisodeNumeral('12')).toBe(12);
        expect(parseEpisodeNumeral('十十')).toBeUndefined();
    });
});

describe('parseEpisodeFileName', () => {
    it('should read number, arc label and title', () => {
        expect(parseEpisodeFileName('01 - 森之聖誕2010 - 第一集 - 不會飛走的氣球.m4a')).toEqual({
            file: '01 - 森之聖誕2010 - 第一集 - 不會飛走的氣球.m4a',
            no: 1,
            zhNo: 1,
            label: '森之聖誕2010',
            title: '不會飛走的氣球',
            ext: '.m4a',
        });
    });

    it('should keep " - " inside the arc name and handle 第零集', () => {
        expect(parseEpisodeFileName('03 - 森之愛情I - 森之聖誕 - 第三集.m4a')).toMatchObject({
            no: 3,
            label: '森之愛情I - 森之聖誕',
            title: '',
        });
        expect(parseEpisodeFileName('00 - 初戀嗱喳麵 - 第零集 - 前傳.m4a')).toMatchObject({
            no: 0,
            zhNo: 0,
        });
    });

    it('should normalise NFD names to NFC', () => {
        expect(parseEpisodeFileName(`01 - ${NFD_NAME} - 第一集.m4a`)?.label).toBe(
            'Café'.normalize('NFC'),
        );
    });

    it('should return null for names outside the pattern', () => {
        expect(parseEpisodeFileName('第一集.m4a')).toBeNull();
        expect(parseEpisodeFileName('01 森林 第一集.m4a')).toBeNull();
    });
});

describe('findSuspicious', () => {
    it('should flag roman numerals, full-width, NFD, spaces and invisible characters', () => {
        expect(findSuspicious('森之愛情Ⅱ - 電燈膽').join()).toContain('U+2161');
        expect(findSuspicious('Ｘ時mas').join()).toContain('U+FF38');
        expect(findSuspicious(NFD_NAME).join()).toContain('NFD');
        expect(findSuspicious(' 短篇 ').join()).toContain('頭尾');
        expect(findSuspicious('短 篇  名').join()).toContain('連續空格');
        expect(findSuspicious('短篇​').join()).toContain('U+200B');
        expect(findSuspicious('短篇　名').join()).toContain('U+3000');
        expect(findSuspicious('蘭茜夫人劇場')).toEqual([]);
    });

    it('should flag full-width Latin letters and digits only', () => {
        expect(findSuspicious('第０集').join()).toContain('U+FF10');
        expect(findSuspicious('ａ篇').join()).toContain('U+FF41');
    });

    it('should not flag Chinese full-width punctuation, nor suggest ASCII punctuation', () => {
        // lancy 已上架嘅集名真係用「？」；R2 key 就係咁，改名會令網址（已儲進度嘅 key）變
        expect(findSuspicious('39 - 公子森林 - 第三十九集 - 大結局？.m4a')).toEqual([]);
        expect(findSuspicious('！，：（）；～')).toEqual([]);
        expect(findSuspicious('Ｘ時mas').join()).not.toContain('半形係');
    });
});

describe('byteOrder', () => {
    it('should sort by UTF-8 bytes like an R2 listing (not UTF-16 code units)', () => {
        // U+FF5E（3 bytes EF BD 9E）< U+1F600（4 bytes F0 9F 98 80）；UTF-16 次序剛好相反
        const names = ['\u{1F600}', '～', 'b', 'a', 'ab'];
        expect([...names].sort(byteOrder)).toEqual(['a', 'ab', 'b', '～', '\u{1F600}']);
    });
});
