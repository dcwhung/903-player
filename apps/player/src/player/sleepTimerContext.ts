import { createContext } from 'react';
import type { SleepTimerController } from './SleepTimerController';
import type { SleepTimerScheduler } from './SleepTimerScheduler';

/** PlayerProvider 提供：全 app 一個睡眠 timer，跟住唯一嘅 AudioController */
export const SleepTimerContext = createContext<SleepTimerController | null>(null);

/** PlayerProvider 提供：睡眠 timer 每晚自動排程（跟住同一個 controller） */
export const SleepTimerScheduleContext = createContext<SleepTimerScheduler | null>(null);
