import { useCallback } from 'react';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import {
    pickInitialRecording,
    pickTodayDate,
    recordingsForShow,
    showsOnDate,
} from '../selectors/recordings';
import type { ShowId } from '../types/recording';
import { hkToday } from '../utils/date';

/**
 * 揀出要播嘅錄音並即時開始播放。
 * 主頁喺 click handler 入面直接 call，令 iOS 容許自動播放。
 */
export const useStartPlayback = () => {
    const { status, recordings } = useRecordings();
    const { load } = usePlayer();
    const ready = status === 'ready';

    const startShow = useCallback(
        (showId: ShowId) => {
            const recording = pickInitialRecording(
                recordingsForShow(recordings, showId),
                hkToday(),
            );
            if (ready && recording) {
                void load(recording, { autoplay: true });
            }
        },
        [ready, recordings, load],
    );

    const startToday = useCallback(() => {
        const date = pickTodayDate(recordings, hkToday());
        const recording = date ? showsOnDate(recordings, date)[0] : undefined;
        if (ready && recording) {
            void load(recording, { autoplay: true });
        }
    }, [ready, recordings, load]);

    return { ready, startShow, startToday };
};
