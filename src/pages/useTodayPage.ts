import { useEffect, useMemo } from 'react';
import { themeFor } from '../config/showThemes';
import { useRecordings } from '../data/useRecordings';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { todayRecordings } from '../selectors/recordings';
import { getWatchedUrls } from '../services/progressStore';
import { hkToday } from '../utils/date';
import { toTodayItems } from './todayItems';

/** 入嚟時未播今日節目就自動播第一個 */
const useAutoplayToday = (hasShows: boolean, isPlayingToday: boolean) => {
    const { status } = useRecordings();
    const { startToday } = useStartPlayback();
    useEffect(() => {
        if (status === 'ready' && hasShows && !isPlayingToday) {
            startToday();
        }
    }, [status, hasShows, isPlayingToday, startToday]);
};

/** 今日節目頁嘅資料同動作 */
export const useTodayPage = () => {
    const { status, recordings, reload } = useRecordings();
    const player = usePlayer();

    // 每次 render 重新計，app 開過香港午夜都會轉日
    const today = hkToday();
    const list = useMemo(() => todayRecordings(recordings, today), [recordings, today]);
    const playingIndex = list.findIndex((r) => r.url === player.recording?.url);
    const index = Math.max(0, playingIndex);
    const current = list[index];
    useAutoplayToday(list.length > 0, playingIndex >= 0);

    // 有集數變成聽過（watchedRevision 改變）先重新讀 localStorage
    const watchedUrls = useRefreshedOn(getWatchedUrls, [player.watchedRevision]);
    const items = toTodayItems(list, index, player.isPlaying, watchedUrls);

    const selectIndex = (i: number) => {
        const recording = list[i];
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };
    const selectShow = (url: string) => selectIndex(list.findIndex((r) => r.url === url));

    const theme = themeFor(current?.showId);
    return { status, reload, current, index, items, theme, selectIndex, selectShow };
};
