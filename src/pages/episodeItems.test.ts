import { recording } from '../../tests/renderWithProviders';
import { toEpisodeItems } from './episodeItems';

const NEWEST = recording('gongzi', '2026-10-17');
const OLDER = recording('gongzi', '2026-10-10');
const PROGRESS = {
    [OLDER.url]: { position: 600, duration: 2400, watched: false, updatedAt: 0 },
};

describe('toEpisodeItems', () => {
    it('lists unavailable episodes as disabled rows with no progress', () => {
        const items = toEpisodeItems(
            [{ showId: 'gongzi', date: '2026-10-24', time: '2308' }, NEWEST],
            NEWEST.url,
            { currentTime: 0, duration: 0 },
            {},
            false,
        );

        expect(items[0]).toEqual({
            key: 'gongzi:2026-10-24',
            dayMonth: '24/10',
            weekday: '星期六',
            current: false,
            isPlaying: false,
            status: { kind: 'unavailable', ratio: 0, text: '未上架' },
        });
    });

    it('marks the current episode with live time and the rest with saved progress', () => {
        const items = toEpisodeItems(
            [NEWEST, OLDER],
            NEWEST.url,
            { currentTime: 760, duration: 7110 },
            PROGRESS,
            true,
        );

        expect(items).toEqual([
            {
                key: NEWEST.url,
                dayMonth: '17/10',
                weekday: '星期六',
                current: true,
                isPlaying: true,
                status: { kind: 'playing', ratio: 760 / 7110, text: '播放中 · 12:40 / 1:58:30' },
            },
            {
                key: OLDER.url,
                dayMonth: '10/10',
                weekday: '星期六',
                current: false,
                isPlaying: false,
                status: { kind: 'resume', ratio: 0.25, text: '聽到 10:00' },
            },
        ]);
    });

    it('has no current episode when the url matches none', () => {
        const items = toEpisodeItems(
            [NEWEST],
            undefined,
            { currentTime: 0, duration: 0 },
            {},
            true,
        );

        expect(items[0]?.current).toBe(false);
        expect(items[0]?.isPlaying).toBe(false);
        expect(items[0]?.status.kind).toBe('unwatched');
    });

    it('does not mark the current episode as playing while paused', () => {
        const items = toEpisodeItems(
            [NEWEST],
            NEWEST.url,
            { currentTime: 760, duration: 7110 },
            {},
            false,
        );

        expect(items[0]?.current).toBe(true);
        expect(items[0]?.isPlaying).toBe(false);
    });
});
