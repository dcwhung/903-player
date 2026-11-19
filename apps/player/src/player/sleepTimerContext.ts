import { createContext } from 'react';
import type { SleepTimerController } from './SleepTimerController';

/** PlayerProvider 提供：全 app 一個睡眠 timer，跟住唯一嘅 AudioController */
export const SleepTimerContext = createContext<SleepTimerController | null>(null);
