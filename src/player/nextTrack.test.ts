import { dailyEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import type { Recording } from '../types/recording';
import { nextTrack } from './nextTrack';

const SERIES = seriesEpisodesOf('chisee');

describe('nextTrack', () => {
    it('continues a series drama in catalogue order, across 短篇', () => {
        const lastOfArc = SERIES.findLastIndex((e) => e.arc === '你生日所以我生日');
        expect(nextTrack(SERIES[lastOfArc]!)).toBe(SERIES[lastOfArc + 1]);
        expect(SERIES[lastOfArc + 1]).toMatchObject({ arc: '大妒忌', no: 1 });
    });

    it('stops after the last 短篇', () => {
        expect(nextTrack(SERIES.at(-1)!)).toBeUndefined();
    });

    it('never auto-advances a show recording or a daily drama', () => {
        const show: Recording = { showId: 'gongzi', date: '2026-10-17', time: '2308', url: 'u' };
        expect(nextTrack(show)).toBeUndefined();
        expect(nextTrack(dailyEpisodesOf('c18')[0]!)).toBeUndefined();
    });
});
