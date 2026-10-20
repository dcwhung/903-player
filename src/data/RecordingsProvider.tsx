import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { probeRecentRecordings, readStoredRecordings } from '../services/audioProbe';
import type { Recording } from '../types/recording';
import { RecordingsContext, type LoadStatus } from './recordingsContext';
import { uniqueByUrl } from './recordingValidation';
import { useProbeRuns, type RecordingsProber } from './useProbeRuns';

export type { RecordingsProber } from './useProbeRuns';

type StoreReader = () => Recording[];

interface RecordingsProviderProps {
    children: ReactNode;
    /** 喺背景直接 probe 原站搵最近嘅錄音；測試時注入 */
    prober?: RecordingsProber;
    /** 之前搵到嘅錄音（同步讀）；測試時注入 */
    readStored?: StoreReader;
}

/** 預設 prober：固定 reference，唔會令 useEffect 每次 render 都重新 probe */
const probeWithProgress: RecordingsProber = (onFound) => probeRecentRecordings({ onFound });

/** App 一開就由 storage 讀返錄音列表，再喺背景 probe 新嘅，令主頁撳掣時已經有資料可以即時播放 */
export const RecordingsProvider = ({
    children,
    prober = probeWithProgress,
    readStored = readStoredRecordings,
}: RecordingsProviderProps) => {
    // 同步讀 storage 做初始值：之前搵到過就即刻顯示，唔使等 probe
    const [recordings, setRecordings] = useState<Recording[]>(() => uniqueByUrl(readStored()));
    const merge = useCallback((found: Recording[]): void => {
        if (found.length > 0) setRecordings((shown) => uniqueByUrl([...shown, ...found]));
    }, []);
    const { isProbing, hasFinishedFirstRun } = useProbeRuns(prober, merge);

    // 新用戶（storage 空）第一輪 probe 未有結果先算載入中；有一集或者第一輪完就 ready
    const status: LoadStatus =
        !hasFinishedFirstRun && recordings.length === 0 ? 'loading' : 'ready';
    const value = useMemo(
        () => ({ status, recordings, isProbing }),
        [status, recordings, isProbing],
    );
    return <RecordingsContext.Provider value={value}>{children}</RecordingsContext.Provider>;
};
