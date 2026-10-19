import { recording } from '../../tests/renderWithProviders';
import { toEpisodeItems } from './episodeItems';

const NEWEST = recording('gongzi', '2026-10-17');
const OLDER = recording('gongzi', '2026-10-10');
const PROGRESS = {
    [OLDER.url]: { position: 600, duration: 2400, watched: false, updatedAt: 0 },
};

describe('toEpisodeItems', () => {
    it('marks the current episode with live time and the rest with saved progress', () => {
        const items = toEpisodeItems(
            [NEWEST, OLDER],
            NEWEST.url,
            { currentTime: 760, duration: 7110 },
            PROGRESS,
        );

        expect(items).toEqual([
            {
                key: NEWEST.url,
                dayMonth: '17/10',
                weekday: '星期六',
                current: true,
                status: { kind: 'playing', ratio: 760 / 7110, text: '播放中 · 12:40 / 1:58:30' },
            },
            {
                key: OLDER.url,
                dayMonth: '10/10',
                weekday: '星期六',
                current: false,
                status: { kind: 'resume', ratio: 0.25, text: '聽到 10:00' },
            },
        ]);
    });

    it('has no current episode when the url matches none', () => {
        const items = toEpisodeItems([NEWEST], undefined, { currentTime: 0, duration: 0 }, {});

        expect(items[0]?.current).toBe(false);
        expect(items[0]?.status.kind).toBe('unwatched');
    });
});
