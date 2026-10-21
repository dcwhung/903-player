import { useEffect, useMemo } from 'react';
import { themeFor } from '../config/showThemes';
import { findShow, type ShowConfig } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import {
    episodesNewestFirst,
    pickInitialRecording,
    recordingsForShow,
} from '../selectors/recordings';
import { stripDays } from '../components/DateStrip/dateStrip';
import { getProgressMap } from '../services/progressStore';
import { hkToday } from '../utils/date';
import { toEpisodeItems } from './episodeItems';

/** 呢個節目嘅集數同揀中嗰集：播緊呢個節目就用播緊嗰集，否則用預設嗰集 */
const useShowEpisodes = (show: ShowConfig | undefined) => {
    const { recordings } = useRecordings();
    const player = usePlayer();
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
    return { episodes, playing, current };
};

/** 直接開呢頁（例如 deep link / mini player）時都自動播放 */
const useAutoplayShow = (show: ShowConfig | undefined, isPlayingShow: boolean) => {
    const { status } = useRecordings();
    const { startShow } = useStartPlayback();
    useEffect(() => {
        if (show && status === 'ready' && !isPlayingShow) {
            startShow(show.id);
        }
    }, [show, status, isPlayingShow, startShow]);
};

/** 節目頁嘅資料同動作 */
export const useShowPage = (showId: string) => {
    const show = findShow(showId);
    const { status, isSearching } = useRecordings();
    const player = usePlayer();
    const { episodes, playing, current } = useShowEpisodes(show);
    useAutoplayShow(show, playing !== null);

    // 轉集或者有集數變成聽過先重新讀 localStorage
    const currentUrl = current?.url;
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, currentUrl]);
    const live = { currentTime: player.currentTime, duration: player.duration };
    const episodeItems = toEpisodeItems(episodes, currentUrl, live, progressMap);

    const selectEpisode = (url: string) => {
        const recording = episodes.find((r) => r.url === url);
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };
    const theme = themeFor(show?.id);
    // 日子條：同撳集數行同一條路（未聽完續播、聽過由頭播）
    const strip = stripDays(episodes, currentUrl);
    return {
        show,
        theme,
        status,
        isSearching,
        current,
        episodeItems,
        strip,
        selectEpisode,
    };
};
