import { recording } from '../../tests/renderWithProviders';
import { themeFor } from '../config/showThemes';
import { toStackCards, toTodayItems } from './todayItems';

const SUNNY = recording('sunnyday', '2026-10-19', '0600');
const BADGIRL = recording('badgirl', '2026-10-19', '1000');
const WANNI = recording('wanni', '2026-10-19', '1300');
const LIST = [SUNNY, BADGIRL, WANNI];

describe('toTodayItems', () => {
    it('builds one row per show with time, art and status', () => {
        const items = toTodayItems(LIST, 0, true, new Set([WANNI.url]));

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
        const items = toTodayItems(LIST, 2, false, new Set([WANNI.url]));

        expect(items.map((item) => item.status)).toEqual(['unwatched', 'unwatched', 'watched']);
        expect(items[2]?.active).toBe(true);
    });
});

describe('toStackCards', () => {
    it('should give each show a card with its name and own theme', () => {
        expect(toStackCards([SUNNY, BADGIRL])).toEqual([
            { key: SUNNY.url, title: '在晴朗的一天出發', theme: themeFor('sunnyday') },
            { key: BADGIRL.url, title: 'Bad Girl大過佬', theme: themeFor('badgirl') },
        ]);
    });
});
