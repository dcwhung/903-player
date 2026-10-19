import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MiniPlayerProps } from '../components/MiniPlayer/MiniPlayer';
import { themeFor } from '../config/showThemes';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import { miniPlayerSubtitle, miniPlayerTimeText } from '../selectors/miniPlayer';
import { todayRecordings } from '../selectors/recordings';
import { getProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { hkToday } from '../utils/date';
import { ratio } from '../utils/ratio';

const showName = (recording: Recording): string => findShow(recording.showId)?.name ?? '';

/** 今日（冇就最近一日）節目入面揀中邊個：有載入就跟 player，否則跟用戶揀 */
const useTodaySelection = () => {
    const { recordings } = useRecordings();
    const player = usePlayer();
    const [chosen, setChosen] = useState(0);
    const today = hkToday();
    const list = useMemo(() => todayRecordings(recordings, today), [recordings, today]);
    const loadedIndex = list.findIndex((r) => r.url === player.recording?.url);
    const isLoaded = loadedIndex >= 0;
    const index = isLoaded ? loadedIndex : Math.min(chosen, list.length - 1);

    // 載入咗今日節目先跟住轉集；本身播緊就繼續播
    const select = (next: number) => {
        setChosen(next);
        const recording = list[next];
        if (isLoaded && recording) {
            void player.load(recording, { autoplay: player.isPlaying });
        }
    };
    return { today, list, index, current: list[index], isLoaded, select };
};

/** 載入咗就用 player 即時時間，否則用 localStorage 存低嘅進度 */
const useShownTime = (url: string | undefined, isLoaded: boolean) => {
    const player = usePlayer();
    // 未載入先要讀 localStorage；轉節目或者有集數變成聽過先再讀
    const saved = useMemo(
        () => (url && !isLoaded ? getProgress(url, player.watchedRevision) : undefined),
        [url, isLoaded, player.watchedRevision],
    );
    return isLoaded
        ? { position: player.currentTime, duration: player.duration }
        : { position: saved?.position ?? 0, duration: saved?.duration ?? 0 };
};

/** 主頁 mini player：只播今日（冇就最近一日）嘅節目 */
export const useMiniPlayer = (): MiniPlayerProps | null => {
    const player = usePlayer();
    const navigate = useNavigate();
    const { today, list, index, current, isLoaded, select } = useTodaySelection();
    const { position, duration } = useShownTime(current?.url, isLoaded);
    if (!current) {
        return null;
    }
    const timeText = miniPlayerTimeText(position, duration);

    return {
        showName: showName(current),
        theme: themeFor(current.showId),
        subtitle: miniPlayerSubtitle(current.date, today, timeText),
        timeText,
        isPlaying: isLoaded && player.isPlaying,
        progress: ratio(position, duration),
        labels: list.map(showName),
        keys: list.map((r) => r.url),
        index,
        onToggle: () =>
            void (isLoaded ? player.toggle() : player.load(current, { autoplay: true })),
        onOpen: () => navigate(`/show/${current.showId}`),
        onChange: select,
    };
};
