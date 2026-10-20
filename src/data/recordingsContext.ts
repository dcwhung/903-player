import { createContext } from 'react';
import type { Recording } from '../types/recording';

/** loading：storage 冇錄音而第一輪 probe 仲未有結果；之後一律 ready */
export type LoadStatus = 'loading' | 'ready';

export interface RecordingsContextValue {
    status: LoadStatus;
    recordings: Recording[];
    /** 背景 probe 緊（唔影響 status）：某節目冇錄音時，未 probe 完唔好話「冇錄音」住 */
    isProbing: boolean;
}

export const RecordingsContext = createContext<RecordingsContextValue | null>(null);
