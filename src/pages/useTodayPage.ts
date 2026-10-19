import { useEffect, useMemo } from 'react';
import type { ShowStatus, TodayShowItem } from '../components/TodayShowList/TodayShowList';
import { themeFor } from '../config/showThemes';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { todayRecordings } from '../selectors/recordings';
import { getWatchedUrls } from '../services/progressStore';
import { hkToday } from '../utils/date';
import { formatBroadcastTime } from '../utils/time';

const statusOf = (isActive: boolean, isPlaying: boolean, isWatched: boolean): ShowStatus => {
    if (isActive && isPlaying) {
        return 'playing';
    }
    return isWatched ? 'watched' : 'unwatched';
};

/** 今日節目頁嘅資料同動作 */
export const useTodayPage = () => {
    const { status, recordings, reload } = useRecordings();
    const player = usePlayer();
    const { startToday } = useStartPlayback();

    // 每次 render 重新計，app 開過香港午夜都會轉日
    const today = hkToday();
    const list = useMemo(() => todayRecordings(recordings, today), [recordings, today]);
    const playingIndex = list.findIndex((r) => r.url === player.recording?.url);
    const index = Math.max(0, playingIndex);
    const current = list[index];

    useEffect(() => {
        if (status === 'ready' && list.length > 0 && playingIndex < 0) {
            startToday();
        }
    }, [status, list, playingIndex, startToday]);

    // 有集數變成聽過（watchedRevision 改變）先重新讀 localStorage
    const watchedUrls = useMemo(
        () => getWatchedUrls(player.watchedRevision),
        [player.watchedRevision],
    );
    const items: TodayShowItem[] = list.map((r, i) => ({
        key: r.url,
        name: findShow(r.showId)?.name ?? '',
        time: formatBroadcastTime(r.time),
        art: themeFor(r.showId).art,
        active: i === index,
        status: statusOf(i === index, player.isPlaying, watchedUrls.has(r.url)),
    }));

    const selectIndex = (i: number) => {
        const recording = list[i];
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };
    const selectShow = (url: string) => selectIndex(list.findIndex((r) => r.url === url));

    return {
        status,
        reload,
        current,
        index,
        items,
        theme: themeFor(current?.showId),
        selectIndex,
        selectShow,
    };
};
