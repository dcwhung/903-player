import { createContext } from 'react';
import type { Recording } from '../types/recording';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface RecordingsContextValue {
    status: LoadStatus;
    recordings: Recording[];
    reload: () => Promise<void>;
}

export const RecordingsContext = createContext<RecordingsContextValue | null>(null);
