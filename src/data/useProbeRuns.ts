import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Recording } from '../types/recording';

/** onFound：每搵到一個就即刻通知；回傳成輪 probe 完之後 storage 入面嘅全部錄音 */
export type RecordingsProber = (onFound?: (recording: Recording) => void) => Promise<Recording[]>;

interface ProbeRuns {
    /** 第一輪 probe 完咗未（成功或者失敗都算） */
    hasFinishedFirstRun: boolean;
}

/**
 * 即刻開始 probe；prober 同步 throw 都轉成 reject，令 finish 一定會行，in-flight 唔會卡死。
 * 唔用 Promise.resolve().then()：會遲一個 microtask 先開始
 */
const startProbe = (
    prober: RecordingsProber,
    onFound: (recording: Recording) => void,
): Promise<Recording[]> => {
    try {
        return prober(onFound);
    } catch (error) {
        return Promise.reject(error);
    }
};

/**
 * 背景 probe 一輪（唔阻住 UI）：每搵到一個即刻 merge，最後再用完整結果對齊一次。
 * 失敗都當完成，照用 storage 已有嘅。isMounted 係 false（unmount 咗）就唔再 merge；
 * finish 一定會行，等 in-flight 標記可以清返
 */
const probeOnce = (
    prober: RecordingsProber,
    isMounted: RefObject<boolean>,
    merge: (found: Recording[]) => void,
    finish: () => void,
): void => {
    const onFound = (recording: Recording): void => {
        if (isMounted.current) merge([recording]);
    };
    startProbe(prober, onFound)
        .then(
            (found) => {
                if (isMounted.current) merge(found);
            },
            () => {},
        )
        .finally(finish);
};

/** 返到前景先再 probe；收埋時唔使 */
const whenVisible = (run: () => void) => (): void => {
    if (document.visibilityState === 'visible') run();
};

/**
 * mount 時 probe 一輪，之後重新上網或者返到前景再 probe（重試頻率由 audioProbe 嘅規則限住）。
 * 同一時間只會有一輪：StrictMode 重複行 effect、幾個 trigger 撞埋都唔會並行 probe
 */
export const useProbeRuns = (
    prober: RecordingsProber,
    merge: (found: Recording[]) => void,
): ProbeRuns => {
    const [hasFinishedFirstRun, setHasFinishedFirstRun] = useState(false);
    const isInFlight = useRef(false);
    const isMounted = useRef(false);

    const run = useCallback(() => {
        if (isInFlight.current) return;
        isInFlight.current = true;
        probeOnce(prober, isMounted, merge, () => {
            isInFlight.current = false;
            if (isMounted.current) setHasFinishedFirstRun(true);
        });
    }, [prober, merge]);

    useEffect(() => {
        isMounted.current = true;
        run();
        const onVisibilityChange = whenVisible(run);
        window.addEventListener('online', run);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            isMounted.current = false;
            window.removeEventListener('online', run);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [run]);

    return { hasFinishedFirstRun };
};
