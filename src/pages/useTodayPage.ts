import { useEffect, useMemo } from 'react';
import { themeFor } from '../config/showThemes';
import { useRecordings } from '../data/useRecordings';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { entriesOnDate, pickTodayDate, todayRecordings } from '../selectors/recordings';
import { getWatchedUrls } from '../services/progressStore';
import { hkToday } from '../utils/date';
import { toStackCards, toTodayItems } from './todayItems';

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

/** 節目表：播得到嘅同未上架嘅一齊（今日全部未上架都照列出今日） */
const useTodayEntries = (today: string) => {
    const { recordings, unavailable } = useRecordings();
    return useMemo(() => {
        const date = pickTodayDate(recordings, today, unavailable);
        return date ? entriesOnDate(recordings, unavailable, date) : [];
    }, [recordings, unavailable, today]);
};

/** 今日節目頁嘅資料同動作 */
export const useTodayPage = () => {
    const { status, recordings, unavailable, isSearching } = useRecordings();
    const player = usePlayer();

    // 每次 render 重新計，app 開過香港午夜都會轉日
    const today = hkToday();
    // 卡疊、指示點、自動播放只用播得到嘅
    const list = useMemo(
        () => todayRecordings(recordings, today, unavailable),
        [recordings, today, unavailable],
    );
    const entries = useTodayEntries(today);
    const playingIndex = list.findIndex((r) => r.url === player.recording?.url);
    const index = Math.max(0, playingIndex);
    const current = list[index];
    useAutoplayToday(list.length > 0, playingIndex >= 0);

    // 有集數變成聽過（watchedRevision 改變）先重新讀 localStorage
    const watchedUrls = useRefreshedOn(getWatchedUrls, [player.watchedRevision]);
    const items = toTodayItems(entries, current?.url, player.isPlaying, watchedUrls);
    const cards = useMemo(() => toStackCards(list), [list]);
    const cardKeys = useMemo(() => list.map((r) => r.url), [list]);

    const selectIndex = (i: number) => {
        const recording = list[i];
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };
    // 節目表：撳播緊嗰個就暫停（掣係暫停樣），其他就轉去嗰個節目
    const selectShow = (url: string) => {
        if (player.isPlaying && url === player.recording?.url) {
            void player.toggle();
            return;
        }
        selectIndex(list.findIndex((r) => r.url === url));
    };

    const theme = themeFor(current?.showId);
    return {
        status,
        isSearching,
        current,
        index,
        items,
        cards,
        cardKeys,
        theme,
        selectIndex,
        selectShow,
    };
};
