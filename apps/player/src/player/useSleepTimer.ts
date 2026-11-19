import { useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
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

/**
 * 全 app 共用一個顯示時鐘：所有 tick 緊嘅 component（月亮掣、選單、進度條）同一刻跳秒，
 * 唔會選單遲開 0.4 秒就同月亮差一秒（用戶 2026-11-19 #3）。
 * 第一個訂閱嗰刻攞最新時間再開 interval，最後一個走就停；冇人 tick 唔行
 */
const createSharedClock = () => {
    let now = Date.now();
    let interval: ReturnType<typeof setInterval> | undefined;
    const listeners = new Set<() => void>();
    /** 攞最新時間，通知所有 tick 緊嘅 component（同一個 now） */
    const refresh = () => {
        now = Date.now();
        listeners.forEach((listener) => listener());
    };
    return {
        getSnapshot: () => now,
        refresh,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            if (interval === undefined) {
                now = Date.now();
                interval = setInterval(refresh, SLEEP_TIMER_CHECK_MS);
            }
            return () => {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    clearInterval(interval);
                    interval = undefined;
                }
            };
        },
    };
};

const sharedClock = createSharedClock();

const idle = () => () => undefined;

/**
 * ticking 先每秒 re-render；restartKey 變（開 / 改 timer）就即刻攞最新時間（paint 之前），
 * 唔好顯示停咗好耐嘅舊時間（S-1182）。時鐘全 app 共用，所以所有 component 一齊更新
 */
const useClock = (ticking: boolean, restartKey: unknown): number => {
    const now = useSyncExternalStore(
        ticking ? sharedClock.subscribe : idle,
        sharedClock.getSnapshot,
        sharedClock.getSnapshot,
    );
    const seenKey = useRef(restartKey);
    useLayoutEffect(() => {
        if (seenKey.current === restartKey) return;
        seenKey.current = restartKey;
        sharedClock.refresh();
    }, [restartKey]);
    return now;
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
