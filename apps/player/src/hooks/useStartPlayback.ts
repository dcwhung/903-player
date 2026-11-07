import { useCallback } from 'react';
import { hkToday } from '@903-player/catalog';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import { pickInitialRecording, recordingsForShow, todayRecordings } from '../selectors/recordings';
import type { ShowId } from '../types/recording';

/**
 * 揀出要播嘅錄音並即時開始播放。
 * 主頁喺 click handler 入面直接 call，令 iOS 容許自動播放。
 * 回 true = 真係開始咗播（未 ready、冇錄音就 false）：主頁格仔用嚟揀入頁過場（S-682）
 */
export const useStartPlayback = () => {
    const { status, recordings } = useRecordings();
    const { load } = usePlayer();
    const ready = status === 'ready';

    const startShow = useCallback(
        (showId: ShowId): boolean => {
            const recording = pickInitialRecording(
                recordingsForShow(recordings, showId),
                hkToday(),
            );
            if (!ready || !recording) return false;
            void load(recording, { autoplay: true });
            return true;
        },
        [ready, recordings, load],
    );

    const startToday = useCallback((): boolean => {
        // 今日有節目播但未上架就唔播（唔會跳去舊日子），同今日節目頁一致
        const recording = todayRecordings(recordings, hkToday())[0];
        if (!ready || !recording) return false;
        void load(recording, { autoplay: true });
        return true;
    }, [ready, recordings, load]);

    return { ready, startShow, startToday };
};
