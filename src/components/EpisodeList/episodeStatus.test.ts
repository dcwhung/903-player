import type { Progress } from '../../services/progressStore';
import { episodeStatus } from './episodeStatus';

const progress = (position: number, duration: number, watched = false): Progress => ({
    position,
    duration,
    watched,
    updatedAt: 0,
});

describe('episodeStatus', () => {
    it('shows live time for the current episode', () => {
        expect(
            episodeStatus({ isCurrent: true, live: { currentTime: 760, duration: 7110 } }),
        ).toEqual({ kind: 'playing', ratio: 760 / 7110, text: '播放中 · 12:40 / 1:58:30' });
    });

    it('shows connecting without times while the duration is unknown (offline)', () => {
        expect(
            episodeStatus({ isCurrent: true, live: { currentTime: 1449, duration: 0 } }),
        ).toEqual({ kind: 'playing', ratio: 0, text: '連線中…' });
    });

    it('marks watched episodes', () => {
        expect(episodeStatus({ isCurrent: false, progress: progress(10, 100, true) })).toEqual({
            kind: 'watched',
            ratio: 1,
            text: '已收聽',
        });
    });

    it('shows where a partly heard episode stopped', () => {
        expect(episodeStatus({ isCurrent: false, progress: progress(2710, 7000) })).toEqual({
            kind: 'resume',
            ratio: 2710 / 7000,
            text: '聽到 45:10',
        });
    });

    it('treats missing or zero progress as unheard', () => {
        expect(episodeStatus({ isCurrent: false })).toEqual({
            kind: 'unwatched',
            ratio: 0,
            text: '未收聽',
        });
        expect(episodeStatus({ isCurrent: false, progress: progress(0, 0) }).kind).toBe(
            'unwatched',
        );
    });

    it('does not divide by an unknown duration', () => {
        expect(
            episodeStatus({ isCurrent: true, live: { currentTime: 0, duration: 0 } }).ratio,
        ).toBe(0);
    });
});
