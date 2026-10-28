import { useEffect, useMemo } from 'react';
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

/** 卡疊 / 指示點轉節目，同節目表撳一行 */
const useTodayActions = (playable: Recording[]) => {
    const player = usePlayer();
    const selectIndex = (i: number) => {
        const recording = playable[i];
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
        selectIndex(playable.findIndex((r) => r.url === url));
    };
    return { selectIndex, selectShow };
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

/** 今日節目頁嘅資料同動作 */
export const useTodayPage = () => {
    const { status, recordings, unavailable, isSearching } = useRecordings();
    const player = usePlayer();
    // 每次 render 重新計，app 開過香港午夜都會轉日；日子只喺 todayView 計一次
    const today = hkToday();
    const { playable, entries } = useMemo(
        () => todayView(recordings, unavailable, today),
        [recordings, unavailable, today],
    );
    // 卡疊、指示點、自動播放只用播得到嘅；節目表（entries）連未上架
    const playingIndex = playable.findIndex((r) => r.url === player.recording?.url);
    const isPlayingToday = playingIndex >= 0;
    const index = Math.max(0, playingIndex);
    const current = playable[index];
    useAutoplayToday(playable.length > 0, isPlayingToday);

    const items = useTodayItems(entries, current?.url, isPlayingToday);
    const cards = useMemo(() => toStackCards(playable), [playable]);
    const cardKeys = useMemo(() => playable.map((r) => r.url), [playable]);
    const actions = useTodayActions(playable);
    const start = useStandbyStart(isPlayingToday, () => actions.selectIndex(index));
    const theme = themeFor(current?.showId);
    const view = { status, isSearching, current, start, index, items, cards, cardKeys, theme };
    return { ...view, ...actions };
};
