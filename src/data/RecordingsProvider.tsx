import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Recording } from '../types/recording';
import { fetchRecordings } from './recordingsApi';
import { RecordingsContext, type LoadStatus } from './recordingsContext';

interface RecordingsProviderProps {
    children: ReactNode;
    /** 測試時注入 */
    loader?: () => Promise<Recording[]>;
}

/** App 一開就載入錄音列表，令主頁撳掣時已經有資料可以即時播放 */
export const RecordingsProvider = ({
    children,
    loader = fetchRecordings,
}: RecordingsProviderProps) => {
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        loader().then(
            (result) => {
                if (active) {
                    setRecordings(result);
                    setStatus('ready');
                }
            },
            () => {
                if (active) {
                    setStatus('error');
                }
            },
        );
        return () => {
            active = false;
        };
    }, [loader, attempt]);

    const reload = useCallback(async () => {
        setStatus('loading');
        setAttempt((count) => count + 1);
    }, []);

    const value = useMemo(() => ({ status, recordings, reload }), [status, recordings, reload]);
    return <RecordingsContext.Provider value={value}>{children}</RecordingsContext.Provider>;
};
