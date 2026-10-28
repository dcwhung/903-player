import { useEffect, useMemo, useState } from 'react';
import { themeFor } from '../shows';
import { useRecordings } from '../data/useRecordings';
import { useAudioBusy } from '../hooks/useAudioBusy';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { useStandbyStart } from '../hooks/useStandbyStart';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { todayView } from '../selectors/recordings';
import { getWatchedUrls } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { hkToday } from '../utils/date';
import { toStackCards, toTodayItems } from './todayItems';

/**
 * 入嚟時未播今日節目、亦冇其他嘢佔住（useAudioBusy）就自動播第一個；
 * 有其他嘢播緊 / 暫停緊就唔蓋過（用戶可能只係想睇節目表），卡疊係未開始樣等用戶撳
 */
const useAutoplayToday = (hasShows: boolean, isPlayingToday: boolean) => {
    const { status } = useRecordings();
    const busy = useAudioBusy();
    const { startToday } = useStartPlayback();
    useEffect(() => {
        if (status === 'ready' && hasShows && !isPlayingToday && !busy) {
            startToday();
        }
    }, [status, hasShows, isPlayingToday, busy, startToday]);
};

/**
 * 卡疊 / 指示點轉節目，同節目表撳一行。
 * standby（播緊其他嘢、唔係今日節目）：掃卡 / 撳指示點淨係換睇邊張（browsed），唔蓋過播緊嘅嘢，
 * 撳播放先播嗰張；節目表撳一行係明確要播，照即刻播
 */
const useTodayActions = (playable: Recording[], standby: boolean) => {
    const player = usePlayer();
    const [browsed, setBrowsed] = useState(0);
    const playIndex = (i: number) => {
        const recording = playable[i];
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };
    const selectIndex = (i: number) => (standby ? setBrowsed(i) : playIndex(i));
    // 節目表：撳播緊嗰個就暫停（掣係暫停樣），其他就轉去嗰個節目
    const selectShow = (url: string) => {
        if (player.isPlaying && url === player.recording?.url) {
            void player.toggle();
            return;
        }
        playIndex(playable.findIndex((r) => r.url === url));
    };
    return { browsed, playIndex, selectIndex, selectShow };
};

/** 節目表每行：播緊其他嘢（唔係今日節目）唔當播緊；有集數變成聽過先重新讀 localStorage */
const useTodayItems = (
    entries: Parameters<typeof toTodayItems>[0],
    activeUrl: string | undefined,
    isPlayingToday: boolean,
) => {
    const player = usePlayer();
    const watchedUrls = useRefreshedOn(getWatchedUrls, [player.watchedRevision]);
    return toTodayItems(entries, activeUrl, isPlayingToday && player.isPlaying, watchedUrls);
};

/**
 * 卡疊揀中邊張：播緊今日節目就跟播緊嗰個；未播（standby / 等緊自動播）就係睇緊嗰張。
 * 卡疊、指示點、自動播放只用播得到嘅（playable）
 */
const useTodayStack = (playable: Recording[]) => {
    const player = usePlayer();
    const playingIndex = playable.findIndex((r) => r.url === player.recording?.url);
    const isPlayingToday = playingIndex >= 0;
    useAutoplayToday(playable.length > 0, isPlayingToday);
    const standby = !isPlayingToday && player.recording !== null;
    const { browsed, playIndex, ...actions } = useTodayActions(playable, standby);
    const lastIndex = Math.max(0, playable.length - 1);
    const index = isPlayingToday ? playingIndex : Math.min(browsed, lastIndex);
    const start = useStandbyStart(isPlayingToday, () => playIndex(index));
    return { isPlayingToday, index, current: playable[index], start, actions };
};

/** 今日節目頁嘅資料同動作 */
export const useTodayPage = () => {
    const { status, recordings, unavailable, isSearching } = useRecordings();
    // 每次 render 重新計，app 開過香港午夜都會轉日；日子只喺 todayView 計一次
    const today = hkToday();
    const { playable, entries } = useMemo(
        () => todayView(recordings, unavailable, today),
        [recordings, unavailable, today],
    );
    const { isPlayingToday, index, current, start, actions } = useTodayStack(playable);
    const items = useTodayItems(entries, current?.url, isPlayingToday);
    const cards = useMemo(() => toStackCards(playable), [playable]);
    const cardKeys = useMemo(() => playable.map((r) => r.url), [playable]);
    const theme = themeFor(current?.showId);
    const view = { status, isSearching, current, start, index, items, cards, cardKeys, theme };
    return { ...view, ...actions };
};

/** 今日節目頁嘅資料同動作（畀頁面兩欄揀需要嘅部分做 props） */
export type TodayView = ReturnType<typeof useTodayPage>;
