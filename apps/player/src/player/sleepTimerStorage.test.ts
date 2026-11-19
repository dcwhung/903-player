import { SLEEP_TIMER_STORAGE_KEY } from '../config/constants';
import type { SleepTimerState } from './sleepTimer';
import { loadSleepTimer, saveSleepTimer } from './sleepTimerStorage';

const NOW = 1_000_000;
const TIMER: SleepTimerState = {
    kind: 'episode',
    option: 'episode',
    startedAt: NOW,
    deadline: NOW + 60_000,
    episodeId: 'id:episode-1',
};

afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
});

const throwOnStorage = (method: 'getItem' | 'setItem' | 'removeItem') =>
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error('SecurityError');
    });

describe('sleep timer session storage', () => {
    it('should restore an unexpired timer after a reload', () => {
        saveSleepTimer(TIMER);
        expect(sessionStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).not.toBeNull();
        expect(loadSleepTimer(NOW + 1)).toEqual(TIMER);
    });

    it('should use sessionStorage, not localStorage (per tab)', () => {
        saveSleepTimer(TIMER);
        expect(localStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).toBeNull();
    });

    it('should drop an expired minutes timer on load', () => {
        const minutes: SleepTimerState = {
            kind: 'minutes',
            option: 15,
            startedAt: NOW,
            deadline: NOW + 1,
        };
        saveSleepTimer(minutes);
        expect(loadSleepTimer(minutes.deadline)).toBeNull();
        expect(sessionStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).toBeNull();
    });

    it('should keep an "end of episode" timer past its deadline for the controller to decide (S-1180)', () => {
        // 同一集暫停到過咗 background 截止時間：用戶決定 (1) 等播完先清，交畀 controller 睇載咗邊集
        saveSleepTimer(TIMER);
        expect(loadSleepTimer(TIMER.deadline + 60_000)).toEqual(TIMER);
    });

    it('should clear the stored timer when saving null', () => {
        saveSleepTimer(TIMER);
        saveSleepTimer(null);
        expect(sessionStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).toBeNull();
    });

    it('should return null when nothing is stored', () => {
        expect(loadSleepTimer(NOW)).toBeNull();
    });

    it.each([
        ['not json', '{'],
        ['wrong kind', JSON.stringify({ ...TIMER, kind: 'hours' })],
        ['wrong option', JSON.stringify({ ...TIMER, option: 45 })],
        ['missing deadline', JSON.stringify({ ...TIMER, deadline: undefined })],
        ['non-finite start', JSON.stringify({ ...TIMER, startedAt: 'x' })],
        ['episode without id', JSON.stringify({ ...TIMER, episodeId: undefined })],
        ['deadline before start', JSON.stringify({ ...TIMER, deadline: NOW - 1 })],
        ['null', 'null'],
    ])('should drop a malformed stored timer (%s)', (_label, raw) => {
        sessionStorage.setItem(SLEEP_TIMER_STORAGE_KEY, raw);
        expect(loadSleepTimer(NOW)).toBeNull();
        expect(sessionStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).toBeNull();
    });

    it('should keep only the known fields of a minutes timer', () => {
        sessionStorage.setItem(
            SLEEP_TIMER_STORAGE_KEY,
            JSON.stringify({
                kind: 'minutes',
                option: 15,
                startedAt: NOW,
                deadline: NOW + 1,
                x: 1,
            }),
        );
        expect(loadSleepTimer(NOW)).toEqual({
            kind: 'minutes',
            option: 15,
            startedAt: NOW,
            deadline: NOW + 1,
        });
    });

    it('should not throw when sessionStorage throws', () => {
        throwOnStorage('getItem');
        throwOnStorage('setItem');
        throwOnStorage('removeItem');
        expect(() => saveSleepTimer(TIMER)).not.toThrow();
        expect(() => saveSleepTimer(null)).not.toThrow();
        expect(loadSleepTimer(NOW)).toBeNull();
    });
});
