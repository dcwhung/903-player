import { sleepTimerView } from './sleepTimerView';

const RUNNING = { remaining: 60_000 };

describe('sleepTimerView', () => {
    it('should hide everything in the daytime with no timer', () => {
        expect(sleepTimerView({ night: false, hasTimer: false, ...RUNNING })).toEqual({
            visible: false,
            active: false,
        });
    });

    it('should show the off moon at night with no timer', () => {
        expect(sleepTimerView({ night: true, hasTimer: false, ...RUNNING })).toEqual({
            visible: true,
            active: false,
        });
    });

    it('should show a running timer day or night', () => {
        expect(sleepTimerView({ night: false, hasTimer: true, ...RUNNING })).toEqual({
            visible: true,
            active: true,
        });
    });

    it('should not flash a solid 0:00 moon for a stale timer the controller has not cleared yet', () => {
        // 重新載入：過咗期嘅「播完呢集」喺 attach 之前可能喺 snapshot 出一格（剩 0）
        expect(sleepTimerView({ night: false, hasTimer: true, remaining: 0 })).toEqual({
            visible: false,
            active: false,
        });
        expect(sleepTimerView({ night: true, hasTimer: true, remaining: 0 })).toEqual({
            visible: true,
            active: false,
        });
    });
});
