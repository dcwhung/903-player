import type { ShowConfig } from '@903-player/catalog';
import { recording, unavailableEpisode } from '../../../tests/renderWithProviders';
import { toTodayItems } from './todayItems';

/** 示範資料：在晴朗的一天出發有播放時間 / 主持 / 簡介，其他節目冇（真 catalog 未有） */
vi.mock('../../catalog/shows', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/shows')>();
    const withInfo = (show: ShowConfig | undefined): ShowConfig | undefined =>
        show?.id === 'sunnyday'
            ? {
                  ...show,
                  airTime: { start: '06:00', end: '10:00' },
                  hosts: ['主持甲'],
                  summary: '節目示範簡介',
              }
            : show;
    return { ...actual, findShow: (id: string) => withInfo(actual.findShow(id)) };
});

const SUNNY = recording('sunnyday', '2026-10-19', '0600');
const BADGIRL = recording('badgirl', '2026-10-19', '1000');

describe('toTodayItems item info（P9.5 #12）', () => {
    it('should carry the show info on a row of a show that has some', () => {
        const [sunny] = toTodayItems([SUNNY], undefined, false, new Set());
        expect(sunny?.info).toEqual({
            airTime: '星期一至五（06:00 - 10:00）',
            hosts: ['主持甲'],
            summary: '節目示範簡介',
        });
    });

    it('should leave info out on a row of a show without any', () => {
        const [badgirl] = toTodayItems([BADGIRL], undefined, false, new Set());
        expect(badgirl).not.toHaveProperty('info');
    });

    it('should carry the info on a row that is not up yet', () => {
        const [row] = toTodayItems(
            [unavailableEpisode('sunnyday', '2026-10-19', '0600')],
            undefined,
            false,
            new Set(),
        );
        expect(row?.status).toBe('unavailable');
        expect(row?.info?.summary).toBe('節目示範簡介');
    });
});
