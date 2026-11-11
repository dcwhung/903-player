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

    // S-821：例子係「模板砌出嚟嘅樣」，兩種劇都唔用逐集 file override
    it('should ignore the files override of a series arc (S-821)', () => {
        const json = {
            kind: 'series',
            audio: audio('{arc} - 第 {no2} 集.m4a'),
            arcs: [{ id: 'a', name: '甲', episodes: 2, files: { 1: 'odd name.m4a' } }],
        };
        expect(exampleFileName(json)).toBe('甲 - 第 01 集.m4a');
    });

    it('should ignore the file override of a daily episode (S-821)', () => {
        const json = {
            kind: 'daily',
            audio: audio('{yyyymmdd}.m4a'),
            episodes: [{ date: '2025-08-13', rerun: true, file: 'old.m4a' }],
        };
        expect(exampleFileName(json)).toBe('20250813.m4a');
    });

    it('should give nothing for a daily drama without episodes (S-822)', () => {
        expect(exampleFileName({ kind: 'daily', audio: audio('{yyyymmdd}.m4a') })).toBeUndefined();
        expect(
            exampleFileName({ kind: 'daily', audio: audio('{yyyymmdd}.m4a'), episodes: [] }),
        ).toBeUndefined();
    });

    it('should treat a drama without kind as a series (S-822)', () => {
        const json = { audio: audio('{arc} {no2}.m4a'), arcs: [{ name: '甲', episodes: 1 }] };
        expect(exampleFileName(json)).toBe('甲 01.m4a');
    });

    it('should give nothing for an unclosed token or group (S-822)', () => {
        const arcs = [{ name: '甲', episodes: 1 }];
        for (const file of ['{no2 [ - {title}.m4a', '{arc} - {no2.m4a', '{no2}[ - {title}.m4a'])
            expect(exampleFileName({ kind: 'series', audio: audio(file), arcs })).toBeUndefined();
        const episodes = [{ date: '2026-11-01' }];
        expect(
            exampleFileName({ kind: 'daily', audio: audio('{yyyymmdd.m4a'), episodes }),
        ).toBeUndefined();
    });
});
