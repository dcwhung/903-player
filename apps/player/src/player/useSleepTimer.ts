import { useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { SLEEP_TIMER_CHECK_MS } from '../config/constants';
import type { SleepTimerOption, SleepTimerState } from './sleepTimer';
import { SleepTimerContext } from './sleepTimerContext';

export interface UseSleepTimerOptions {
    /** 冇開 timer 都每秒更新 now（例如選單顯示「播完呢集」剩餘時間）；預設只喺開緊時 tick */
    tickWhileIdle?: boolean;
}

export interface SleepTimerApi {
    /** null = 冇開 */
    timer: SleepTimerState | null;
    /** 上次揀嘅選項（未開時嗰粒用框線 highlight） */
    lastOption: SleepTimerOption | null;
    /** 每秒更新嘅 Date.now()：用嚟計 remainingMs(now) / fraction(now) */
    now: number;
    /** 剩餘 ms；冇 timer = 0 */
    remainingMs: (now: number) => number;
    /** 剩餘比例 1 → 0；冇 timer = 0 */
    fraction: (now: number) => number;
    /** 呢集仲有幾耐播完；undefined = 直播 / 未載到（「播完呢集」變灰） */
    episodeRemainingMs: () => number | undefined;
    /** 一揀即開始計；「播完呢集」被拒（直播 / 冇載嘢）返回 false */
    start: (option: SleepTimerOption) => boolean;
    cancel: () => void;
}

/** 每個用 hook 嘅 component 自己一個時鐘：subscribe 嗰刻（開始 / 換 timer）即刻攞最新時間，之後每秒 */
const createClock = () => {
    let now = Date.now();
    return {
        getSnapshot: () => now,
        subscribe: (listener: () => void) => {
            now = Date.now();
            const interval = setInterval(() => {
                now = Date.now();
                listener();
            }, SLEEP_TIMER_CHECK_MS);
            return () => clearInterval(interval);
        },
    };
};

const idle = () => () => undefined;

/**
 * ticking 先每秒 re-render；restartKey 變（開 / 改 timer）就換一個新時鐘（由而家起計）並重新訂閱，
 * 唔好顯示停咗好耐嘅舊時間（S-1182：render 期間跟 prop 調整 state，唔使 disable exhaustive-deps）
 */
const useClock = (ticking: boolean, restartKey: unknown): number => {
    const [current, setCurrent] = useState(() => ({ key: restartKey, clock: createClock() }));
    if (current.key !== restartKey) {
        setCurrent({ key: restartKey, clock: createClock() });
    }
    const { clock } = current;
    const subscribe = useMemo(() => (ticking ? clock.subscribe : idle), [clock, ticking]);
    return useSyncExternalStore(subscribe, clock.getSnapshot, clock.getSnapshot);
};

/**
 * 睡眠 timer（9d）。timer 開緊（或者 tickWhileIdle）先每秒 re-render，
 * 而且只限用呢個 hook 嘅 component；其他 component 唔受影響
 */
export const useSleepTimer = ({
    tickWhileIdle = false,
}: UseSleepTimerOptions = {}): SleepTimerApi => {
    const controller = useContext(SleepTimerContext);
    if (!controller) {
        throw new Error('useSleepTimer must be used inside <PlayerProvider>');
    }
    const { timer, lastOption } = useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
        controller.getSnapshot,
    );
    const now = useClock(timer !== null || tickWhileIdle, timer);
    return {
        timer,
        lastOption,
        now,
        remainingMs: controller.remainingMs,
        fraction: controller.fraction,
        episodeRemainingMs: controller.episodeRemainingMs,
        start: controller.start,
        cancel: controller.cancel,
    };
};
