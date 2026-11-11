import { exampleFileName } from './example';

const audio = (file: string) => ({ host: 'r2', folder: '蘭茜夫人劇場', file });

describe('exampleFileName', () => {
    it('should render the first episode of the first arc with the template', () => {
        const json = {
            kind: 'series',
            audio: audio('{arc} - 第 {no2} 集[ - {title}].m4a'),
            arcs: [{ id: 'heart', name: '我心不死', episodes: 37 }],
        };
        expect(exampleFileName(json)).toBe('我心不死 - 第 01 集.m4a');
    });

    it('should use firstNo and the episode title when there is one', () => {
        const json = {
            kind: 'series',
            audio: audio('{no2} - {arc} - 第{noZh}集[ - {title}].m4a'),
            arcs: [{ id: 'a', name: '甲', firstNo: 0, episodes: 3, titles: { 0: '前傳' } }],
        };
        expect(exampleFileName(json)).toBe('00 - 甲 - 第零集 - 前傳.m4a');
    });

    it('should use the earliest date for a daily drama', () => {
        const json = {
            kind: 'daily',
            audio: audio('{yyyymmdd}.m4a'),
            episodes: [{ date: '2026-11-02' }, { date: '2026-11-01' }],
        };
        expect(exampleFileName(json)).toBe('20261101.m4a');
    });

    it('should give nothing for a broken template or nothing to render', () => {
        expect(
            exampleFileName({ kind: 'series', audio: audio('{nope}.m4a'), arcs: [{ name: 'a' }] }),
        ).toBeUndefined();
        expect(
            exampleFileName({ kind: 'series', audio: audio('{no2}.m4a'), arcs: [] }),
        ).toBeUndefined();
        expect(exampleFileName({})).toBeUndefined();
    });
});
