import { useEffect, useMemo } from 'react';
import type { ShowStatus, TodayShowItem } from '../components/TodayShowList/TodayShowList';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { pickTodayDate, showsOnDate } from '../selectors/recordings';
import { isWatched } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { hkToday } from '../utils/date';

const statusOf = (recording: Recording, isActive: boolean, isPlaying: boolean): ShowStatus => {
    if (isActive && isPlaying) {
        return 'playing';
    }
    return isWatched(recording.url) ? 'watched' : 'unwatched';
};

/** 今日節目頁嘅資料同動作 */
export const useTodayPage = () => {
    const { status, recordings, reload } = useRecordings();
    const player = usePlayer();
    const { startToday } = useStartPlayback();

    const date = useMemo(() => pickTodayDate(recordings, hkToday()), [recordings]);
    const list = useMemo(() => (date ? showsOnDate(recordings, date) : []), [recordings, date]);
    const playing = list.find((r) => r.url === player.recording?.url) ?? null;
    const current = playing ?? list[0];

    useEffect(() => {
        if (status === 'ready' && list.length > 0 && !playing) {
            startToday();
        }
    }, [status, list, playing, startToday]);

    const items: TodayShowItem[] = list.map((r) => ({
        key: r.url,
        name: findShow(r.showId)?.name ?? '',
        active: r.url === current?.url,
        status: statusOf(r, r.url === current?.url, player.isPlaying),
    }));

    const selectShow = (url: string) => {
        const recording = list.find((r) => r.url === url);
        if (recording) {
            void player.load(recording, { autoplay: true });
        }
    };

    return { status, reload, date, current, items, selectShow };
};
