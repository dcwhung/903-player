import { recording } from '../../tests/renderWithProviders';
import { themeFor } from '../shows';
import { toStackCards, toTodayItems } from './todayItems';

const SUNNY = recording('sunnyday', '2026-10-19', '0600');
const BADGIRL = recording('badgirl', '2026-10-19', '1000');
const WANNI = recording('wanni', '2026-10-19', '1300');
const LIST = [SUNNY, BADGIRL, WANNI];

describe('toTodayItems', () => {
    it('builds one row per show with time, art and status', () => {
        const items = toTodayItems(LIST, SUNNY.url, true, new Set([WANNI.url]));

        expect(items).toEqual([
            {
                key: SUNNY.url,
                name: '在晴朗的一天出發',
                time: '06:00',
                art: themeFor('sunnyday').art,
                active: true,
                status: 'playing',
            },
            {
                key: BADGIRL.url,
                name: 'Bad Girl大過佬',
                time: '10:00',
                art: themeFor('badgirl').art,
                active: false,
                status: 'unwatched',
            },
            {
                key: WANNI.url,
                name: '雲妮鍾情',
                time: '13:00',
                art: themeFor('wanni').art,
                active: false,
                status: 'watched',
            },
        ]);
    });

    it('shows the active show by its watched state while paused', () => {
        const items = toTodayItems(LIST, WANNI.url, false, new Set([WANNI.url]));

        expect(items.map((item) => item.status)).toEqual(['unwatched', 'unwatched', 'watched']);
        expect(items[2]?.active).toBe(true);
    });
});

describe('toTodayItems with unavailable shows', () => {
    it('lists them as unavailable rows that are never active', () => {
        const items = toTodayItems(
            [SUNNY, { showId: 'waves', date: '2026-10-19', time: '1510' }],
            SUNNY.url,
            true,
            new Set(),
        );

        expect(items[1]).toEqual({
            key: 'waves:2026-10-19',
            name: '口水多過浪花',
            time: '15:10',
            art: themeFor('waves').art,
            active: false,
            status: 'unavailable',
        });
    });
});

describe('toStackCards', () => {
    it('should give each show a card with its name and own theme', () => {
        expect(toStackCards([SUNNY, BADGIRL])).toEqual([
            { title: '在晴朗的一天出發', theme: themeFor('sunnyday') },
            { title: 'Bad Girl大過佬', theme: themeFor('badgirl') },
        ]);
    });
});
