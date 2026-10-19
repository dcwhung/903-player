import { useEffect, useMemo } from 'react';
import type { EpisodeItem } from '../components/EpisodeList/EpisodeList';
import { episodeStatus } from '../components/EpisodeList/episodeStatus';
import { themeFor } from '../config/showThemes';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import {
    episodesNewestFirst,
    pickInitialRecording,
    recordingsForShow,
} from '../selectors/recordings';
import { getProgressMap } from '../services/progressStore';
import { formatDayMonth, formatWeekday, hkToday } from '../utils/date';

/** 節目頁嘅資料同動作 */
export const useShowPage = (showId: string) => {
    const show = findShow(showId);
    const { status, recordings, reload } = useRecordings();
    const player = usePlayer();
    const { startShow } = useStartPlayback();

    const episodes = useMemo(
        () => (show ? episodesNewestFirst(recordings, show.id) : []),
        [show, recordings],
    );
    const playing = player.recording?.showId === show?.id ? player.recording : null;
    const current =
        playing ??
        (show
            ? pickInitialRecording(recordingsForShow(recordings, show.id), hkToday())
            : undefined);

    // 直接開呢頁（例如 deep link / mini player）時都自動播放
    useEffect(() => {
        if (show && status === 'ready' && !playing) {
            startShow(show.id);
        }
    }, [show, status, playing, startShow]);

    // 轉集或者有集數變成聽過先重新讀 localStorage
    const progressMap = useMemo(
        () => getProgressMap(player.watchedRevision),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- current 係 invalidation key（轉集時剛存咗進度）
        [player.watchedRevision, current?.url],
    );
    const episodeItems: EpisodeItem[] = episodes.map((r) => {
        const isCurrent = r.url === current?.url;
        return {
            key: r.url,
            dayMonth: formatDayMonth(r.date),
            weekday: formatWeekday(r.date),
            current: isCurrent,
            status: episodeStatus({
                isCurrent,
                live: isCurrent
                    ? { currentTime: player.currentTime, duration: player.duration }
                    : undefined,
                progress: progressMap[r.url],
            }),
        };
    });

    const selectEpisode = (url: string) => {
        const recording = episodes.find((r) => r.url === url);
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };

    return {
        show,
        theme: themeFor(show?.id),
        status,
        reload,
        current,
        episodeItems,
        selectEpisode,
    };
};
