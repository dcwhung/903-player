import { miniPlayerSubtitle, miniPlayerTimeText } from './miniPlayer';

describe('miniPlayerTimeText', () => {
    it('formats position and duration', () => {
        expect(miniPlayerTimeText(760, 7110)).toBe('12:40 / 1:58:30');
    });

    it('is undefined while the duration is unknown', () => {
        expect(miniPlayerTimeText(30, 0)).toBeUndefined();
    });
});

describe('miniPlayerSubtitle', () => {
    it('labels today and appends the time', () => {
        expect(miniPlayerSubtitle('2026-10-19', '2026-10-19', '12:40 / 1:58:30')).toBe(
            '今日 19/10（一） · 12:40 / 1:58:30',
        );
    });

    it('shows only the date for the latest-day fallback without time', () => {
        expect(miniPlayerSubtitle('2026-10-17', '2026-10-19')).toBe('17/10（六）');
    });
});
