import { SLEEP_TIMER_CHECK_MS } from '../config/constants';
import type { AudioController } from './AudioController';
import type { SleepTimerOption } from './sleepTimer';
import type { SleepTimerController } from './SleepTimerController';
import {
    minuteOfDay,
    occurrenceAt,
    roundScheduleInstant,
    type SleepTimerSchedule,
} from './sleepTimerSchedule';
import { loadSchedule, saveSchedule } from './sleepTimerStorage';

/** 排程用到嘅 timer / player 功能 */
export type ScheduleTimer = Pick<SleepTimerController, 'start' | 'getSnapshot'>;
export type SchedulePlayer = Pick<AudioController, 'subscribe' | 'hasPlayIntent'>;

type AutoStartListener = (option: SleepTimerOption) => void;

/**
 * 睡眠 timer 每晚自動（用戶 2026-11-19）：手動揀任何選項 = 記低「時間（四捨五入 5 分鐘）+ 選項」，每晚重複，
 * 再揀就取代。到排程時間有嘢播緊即刻開 timer；未播就等，喺排程時間之後 3 個鐘內、05:00 之前開始播先由嗰刻計。
 * 每晚最多一次；嗰刻已經有 timer 開緊就唔覆蓋（當今晚用咗）。「播完呢集」聽緊直播唔生效（時段內轉去聽重溫就生效）。
 * player 每次通知（開始播、轉集）+ 每秒檢查；過咗 05:00 等聽晚
 */
export class SleepTimerScheduler {
    private schedule: SleepTimerSchedule | null = loadSchedule();
    private readonly listeners = new Set<() => void>();
    private readonly autoStartListeners = new Set<AutoStartListener>();
    private interval: ReturnType<typeof setInterval> | undefined;
    private attached = false;

    constructor(
        private readonly timer: ScheduleTimer,
        private readonly player: SchedulePlayer,
    ) {}

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): SleepTimerSchedule | null => this.schedule;

    /** 自動生效時（UI 出 toast） */
    onAutoStart = (listener: AutoStartListener): (() => void) => {
        this.autoStartListeners.add(listener);
        return () => this.autoStartListeners.delete(listener);
    };

    attach = (): (() => void) => {
        const unsubscribe = this.player.subscribe(this.check);
        this.attached = true;
        this.syncInterval();
        this.check();
        return () => {
            unsubscribe();
            this.attached = false;
            this.syncInterval();
        };
    };

    /**
     * 手動揀：開 timer，記低做每晚排程；今晚當用咗（timer 已經開緊，之後再播唔會再開多次）。
     * 開唔到（「播完呢集」聽緊直播）就乜都唔記
     */
    pick = (option: SleepTimerOption): boolean => {
        if (!this.timer.start(option)) return false;
        const at = roundScheduleInstant(Date.now());
        this.setSchedule({ minuteOfDay: minuteOfDay(at), option, firedFor: at });
        return true;
    };

    /** 取消每晚排程（今晚開緊嘅 timer 唔郁） */
    clear = (): void => this.setSchedule(null);

    private check = (): void => {
        const schedule = this.schedule;
        if (!schedule) return;
        const occurrence = occurrenceAt(schedule.minuteOfDay, Date.now());
        if (!occurrence || schedule.firedFor === occurrence.start) return;
        const markFired = () => this.setSchedule({ ...schedule, firedFor: occurrence.start });
        if (this.timer.getSnapshot().timer !== null) {
            markFired();
            return;
        }
        if (!this.player.hasPlayIntent() || !this.timer.start(schedule.option)) return;
        markFired();
        this.autoStartListeners.forEach((listener) => listener(schedule.option));
    };

    private setSchedule(schedule: SleepTimerSchedule | null): void {
        this.schedule = schedule;
        saveSchedule(schedule);
        this.syncInterval();
        this.listeners.forEach((listener) => listener());
    }

    /** 有排程先每秒檢查（排程時刻一到就要開，唔使等 player 通知） */
    private syncInterval(): void {
        if (this.attached && this.schedule) {
            this.interval ??= setInterval(this.check, SLEEP_TIMER_CHECK_MS);
        } else {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }
}
