import { DRAMA_AUDIO_BASE } from '../constants';
import { scanListing } from './listing';
import { listingOf } from './testListing';
import { coverUrls, episodeUrls } from './urls';

const BASE = 'https://r2.invalid';

describe('episodeUrls', () => {
    it('should build encoded series URLs using files overrides and titles', () => {
        const json = {
            kind: 'series',
            audio: {
                host: 'r2',
                folder: '劇 A',
                file: '{no2} - {arc} - 第{noZh}集[ - {title}].m4a',
            },
            arcs: [
                { name: '甲', firstNo: 0, episodes: 2, titles: { 1: '集名' } },
                { name: '乙', episodes: 1, files: { 1: 'odd.m4a' } },
            ],
        };
        expect(episodeUrls(json, BASE)).toEqual([
            `${BASE}/%E5%8A%87%20A/%E7%94%B2/00%20-%20%E7%94%B2%20-%20%E7%AC%AC%E9%9B%B6%E9%9B%86.m4a`,
            `${BASE}/%E5%8A%87%20A/%E7%94%B2/${encodeURIComponent('01 - 甲 - 第一集 - 集名.m4a')}`,
            `${BASE}/%E5%8A%87%20A/%E4%B9%99/odd.m4a`,
        ]);
    });

    it('should build daily URLs from dates or file overrides, defaulting to the R2 base', () => {
        const json = {
            kind: 'daily',
            audio: { host: 'r2', folder: 'd', file: '{yyyymmdd}.m4a' },
            episodes: [{ date: '2026-10-23' }, { date: '2026-10-22', file: 'x y.m4a' }],
        };
        expect(episodeUrls(json)).toEqual([
            `${DRAMA_AUDIO_BASE}/d/20261023.m4a`,
            `${DRAMA_AUDIO_BASE}/d/x%20y.m4a`,
        ]);
    });
});

describe('coverUrls', () => {
    it('should list drama and arc covers', () => {
        const scan = scanListing(listingOf('劇', ['cover photo.png', '甲/cover photo.jpg']));
        expect(coverUrls(scan, '劇', BASE)).toEqual([
            `${BASE}/%E5%8A%87/cover%20photo.png`,
            `${BASE}/%E5%8A%87/%E7%94%B2/cover%20photo.jpg`,
        ]);
    });
});
