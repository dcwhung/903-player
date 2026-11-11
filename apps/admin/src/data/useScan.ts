/*
 * 自動掃描 R2（mockup ②）：入 admin（login / 開返 tab）就 POST /api/scan，完成後刷新待辦等資料。
 * 開返 tab：上次掃描超過 RESCAN_AFTER_MS 先再掃
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { scanAll } from '../api/endpoints';

const RESCAN_AFTER_MS = 5 * 60 * 1000;

export type ScanState =
    | { status: 'scanning' }
    | { status: 'done'; scannedAt: string }
    | { status: 'error'; error: string };

const runScan = async (): Promise<ScanState> => {
    try {
        return { status: 'done', scannedAt: (await scanAll()).scannedAt };
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
};

/** 開返 tab 而上次掃描已經過咗一段時間：再掃 */
const useRescanOnReturn = (lastRun: { current: number }, scan: () => Promise<void>) =>
    useEffect(() => {
        const onVisible = () => {
            const stale = Date.now() - lastRun.current > RESCAN_AFTER_MS;
            if (document.visibilityState === 'visible' && stale) void scan();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [lastRun, scan]);

export const useScan = (onScanned: () => void) => {
    const [state, setState] = useState<ScanState>({ status: 'scanning' });
    const lastRun = useRef(0);
    const onScannedRef = useRef(onScanned);
    useEffect(() => {
        onScannedRef.current = onScanned;
    }, [onScanned]);
    /** 掃完先 setState（effect 入面唔同步 setState） */
    const finish = useCallback(async () => {
        lastRun.current = Date.now();
        setState(await runScan());
        onScannedRef.current();
    }, []);
    const scan = useCallback(async () => {
        setState({ status: 'scanning' });
        await finish();
    }, [finish]);
    useEffect(() => {
        lastRun.current = Date.now();
        void runScan().then((result) => {
            setState(result);
            onScannedRef.current();
        });
    }, []);
    useRescanOnReturn(lastRun, scan);
    return { state, scan };
};
