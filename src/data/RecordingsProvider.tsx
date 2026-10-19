import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { probeRecentRecordings, readCachedRecordings } from '../services/audioProbe';
import type { Recording } from '../types/recording';
import { fetchRecordings } from './recordingsApi';
import { RecordingsContext, type LoadStatus } from './recordingsContext';
import { uniqueByUrl } from './recordingValidation';

type Prober = (known: Recording[]) => Promise<Recording[]>;
type CacheReader = (known: Recording[]) => Recording[];

interface RecordingsProviderProps {
    children: ReactNode;
    /** 測試時注入 */
    loader?: () => Promise<Recording[]>;
    /** 喺 feed 以外直接搵最近嘅錄音（feed 未更新時用）；測試時注入 */
    prober?: Prober;
    /** 之前 probe 到嘅錄音（同步讀）；測試時注入 */
    readCached?: CacheReader;
}

/**
 * feed 一到就即刻併埋之前搵到嘅錄音，再喺背景 probe 新嘅（唔阻住 UI；失敗就淨係用 feed）。
 * isActive 係 false（unmount / reload 咗）就唔再更新
 */
const mergeProbed = (
    feed: Recording[],
    { prober, readCached }: { prober: Prober; readCached: CacheReader },
    isActive: () => boolean,
    apply: (recordings: Recording[]) => void,
): void => {
    apply(uniqueByUrl([...feed, ...readCached(feed)]));
    prober(feed).then(
        (extra) => {
            if (isActive() && extra.length > 0) {
                apply(uniqueByUrl([...feed, ...extra]));
            }
        },
        () => {},
    );
};

/** App 一開就載入錄音列表，令主頁撳掣時已經有資料可以即時播放 */
export const RecordingsProvider = ({
    children,
    loader = fetchRecordings,
    prober = probeRecentRecordings,
    readCached = readCachedRecordings,
}: RecordingsProviderProps) => {
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        loader().then(
            (feed) => {
                if (active) {
                    mergeProbed(feed, { prober, readCached }, () => active, setRecordings);
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
    }, [loader, prober, readCached, attempt]);

    const reload = useCallback(async () => {
        setStatus('loading');
        setAttempt((count) => count + 1);
    }, []);

    const value = useMemo(() => ({ status, recordings, reload }), [status, recordings, reload]);
    return <RecordingsContext.Provider value={value}>{children}</RecordingsContext.Provider>;
};
