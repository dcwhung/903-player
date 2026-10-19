import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { probeRecentRecordings } from '../services/audioProbe';
import type { Recording } from '../types/recording';
import { fetchRecordings } from './recordingsApi';
import { RecordingsContext, type LoadStatus } from './recordingsContext';
import { uniqueByUrl } from './recordingValidation';

interface RecordingsProviderProps {
    children: ReactNode;
    /** 測試時注入 */
    loader?: () => Promise<Recording[]>;
    /** 喺 feed 以外直接搵最近嘅錄音（feed 未更新時用）；測試時注入 */
    prober?: (known: Recording[]) => Promise<Recording[]>;
}

/** App 一開就載入錄音列表，令主頁撳掣時已經有資料可以即時播放 */
export const RecordingsProvider = ({
    children,
    loader = fetchRecordings,
    prober = probeRecentRecordings,
}: RecordingsProviderProps) => {
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        loader().then(
            (result) => {
                if (!active) {
                    return;
                }
                setRecordings(result);
                setStatus('ready');
                // 背景 probe，唔阻住 UI；失敗就淨係用 feed
                prober(result).then(
                    (extra) => {
                        if (active && extra.length > 0) {
                            setRecordings(uniqueByUrl([...result, ...extra]));
                        }
                    },
                    () => {},
                );
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
    }, [loader, prober, attempt]);

    const reload = useCallback(async () => {
        setStatus('loading');
        setAttempt((count) => count + 1);
    }, []);

    const value = useMemo(() => ({ status, recordings, reload }), [status, recordings, reload]);
    return <RecordingsContext.Provider value={value}>{children}</RecordingsContext.Provider>;
};
