import { useEffect, useMemo } from 'react';
import type { DateItem } from '../components/DateSlider/DateSlider';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { pickInitialRecording, recordingsForShow } from '../selectors/recordings';
import { getWatchedUrls } from '../services/progressStore';
import { formatDateLabel, hkToday } from '../utils/date';

/** 節目頁嘅資料同動作 */
export const useShowPage = (showId: string) => {
    const show = findShow(showId);
    const { status, recordings, reload } = useRecordings();
    const player = usePlayer();
    const { startShow } = useStartPlayback();

    const showRecordings = useMemo(
        () => (show ? recordingsForShow(recordings, show.id) : []),
        [show, recordings],
    );
    const playing = player.recording?.showId === show?.id ? player.recording : null;
    const current = playing ?? pickInitialRecording(showRecordings, hkToday());

    // 直接開呢頁（例如 deep link）時都自動播放
    useEffect(() => {
        if (show && status === 'ready' && !playing) {
            startShow(show.id);
        }
    }, [show, status, playing, startShow]);

    const { watchedRevision } = player;
    // 有集數變成聽過（watchedRevision 改變）先重新讀 localStorage
    const watchedUrls = useMemo(() => getWatchedUrls(watchedRevision), [watchedRevision]);
    const dateItems: DateItem[] = showRecordings.map((r) => ({
        key: r.url,
        label: formatDateLabel(r.date),
        watched: watchedUrls.has(r.url),
        selected: r.url === current?.url,
    }));

    const selectDate = (url: string) => {
        const recording = showRecordings.find((r) => r.url === url);
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };

    return { show, status, reload, current, dateItems, selectDate };
};
