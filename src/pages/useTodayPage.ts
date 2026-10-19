import { useEffect, useMemo } from 'react';
import type { ShowStatus, TodayShowItem } from '../components/TodayShowList/TodayShowList';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { pickTodayDate, showsOnDate } from '../selectors/recordings';
import { getWatchedUrls } from '../services/progressStore';
import { hkToday } from '../utils/date';

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
    const date = useMemo(() => pickTodayDate(recordings, today), [recordings, today]);
    const list = useMemo(() => (date ? showsOnDate(recordings, date) : []), [recordings, date]);
    const playing = list.find((r) => r.url === player.recording?.url) ?? null;
    const current = playing ?? list[0];

    useEffect(() => {
        if (status === 'ready' && list.length > 0 && !playing) {
            startToday();
        }
    }, [status, list, playing, startToday]);

    const { watchedRevision } = player;
    // 有集數變成聽過（watchedRevision 改變）先重新讀 localStorage
    const watchedUrls = useMemo(() => getWatchedUrls(watchedRevision), [watchedRevision]);
    const items: TodayShowItem[] = list.map((r) => ({
        key: r.url,
        name: findShow(r.showId)?.name ?? '',
        active: r.url === current?.url,
        status: statusOf(r.url === current?.url, player.isPlaying, watchedUrls.has(r.url)),
    }));

    const selectShow = (url: string) => {
        const recording = list.find((r) => r.url === url);
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };

    return { status, reload, date, current, items, selectShow };
};
