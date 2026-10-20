import { createContext } from 'react';
import type { Recording } from '../types/recording';

/** loading：storage 冇錄音而第一輪 probe 仲未有結果；之後一律 ready */
export type LoadStatus = 'loading' | 'ready';

export interface RecordingsContextValue {
    status: LoadStatus;
    recordings: Recording[];
}

export const RecordingsContext = createContext<RecordingsContextValue | null>(null);
