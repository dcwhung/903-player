import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { probeRecentRecordings, readStoredRecordings } from '../services/audioProbe';
import type { Recording } from '../types/recording';
import { RecordingsContext, type LoadStatus } from './recordingsContext';
import { uniqueByUrl } from './recordingValidation';

/** onFound：每搵到一個就即刻通知；回傳成輪 probe 完之後 storage 入面嘅全部錄音 */
export type RecordingsProber = (onFound?: (recording: Recording) => void) => Promise<Recording[]>;
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

/**
 * 背景 probe（唔阻住 UI）：每搵到一個即刻加入列表，唔使等成輪 probe 完；最後再用完整結果對齊一次。
 * 失敗都當完成，照用 storage 已有嘅。isActive 係 false（unmount 咗）就唔再更新
 */
const probeInBackground = (
    prober: RecordingsProber,
    isActive: () => boolean,
    merge: (found: Recording[]) => void,
    finish: () => void,
): void => {
    const onFound = (recording: Recording): void => {
        if (isActive()) merge([recording]);
    };
    prober(onFound).then(
        (found) => {
            if (!isActive()) return;
            merge(found);
            finish();
        },
        () => {
            if (isActive()) finish();
        },
    );
};

/** App 一開就由 storage 讀返錄音列表，再喺背景 probe 新嘅，令主頁撳掣時已經有資料可以即時播放 */
export const RecordingsProvider = ({
    children,
    prober = probeWithProgress,
    readStored = readStoredRecordings,
}: RecordingsProviderProps) => {
    // 同步讀 storage 做初始值：之前搵到過就即刻顯示，唔使等 probe
    const [recordings, setRecordings] = useState<Recording[]>(() => uniqueByUrl(readStored()));
    const [isProbing, setIsProbing] = useState(true);

    useEffect(() => {
        let active = true;
        const merge = (found: Recording[]): void => {
            if (found.length > 0) setRecordings((shown) => uniqueByUrl([...shown, ...found]));
        };
        probeInBackground(
            prober,
            () => active,
            merge,
            () => setIsProbing(false),
        );
        return () => {
            active = false;
        };
    }, [prober]);

    // 新用戶（storage 空）第一輪 probe 未有結果先算載入中；有一集或者 probe 完就 ready
    const status: LoadStatus = isProbing && recordings.length === 0 ? 'loading' : 'ready';
    const value = useMemo(
        () => ({ status, recordings, isProbing }),
        [status, recordings, isProbing],
    );
    return <RecordingsContext.Provider value={value}>{children}</RecordingsContext.Provider>;
};
