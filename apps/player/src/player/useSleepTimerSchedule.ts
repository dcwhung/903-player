import { useContext, useSyncExternalStore } from 'react';
import { SleepTimerScheduleContext } from './sleepTimerContext';
import type { SleepTimerScheduler } from './SleepTimerScheduler';
import type { SleepTimerSchedule } from './sleepTimerSchedule';

export interface SleepTimerScheduleApi {
    /** null = 冇每晚排程 */
    schedule: SleepTimerSchedule | null;
    /** 手動揀：開 timer 兼記低做每晚排程；開唔到返回 false */
    pick: SleepTimerScheduler['pick'];
    /** 取消每晚排程（今晚開緊嘅 timer 唔郁） */
    clear: SleepTimerScheduler['clear'];
}

/** 睡眠 timer 每晚自動（用戶 2026-11-19） */
export const useSleepTimerSchedule = (): SleepTimerScheduleApi => {
    const scheduler = useContext(SleepTimerScheduleContext);
    if (!scheduler) {
        throw new Error('useSleepTimerSchedule must be used inside <PlayerProvider>');
    }
    const schedule = useSyncExternalStore(
        scheduler.subscribe,
        scheduler.getSnapshot,
        scheduler.getSnapshot,
    );
    return { schedule, pick: scheduler.pick, clear: scheduler.clear };
};
