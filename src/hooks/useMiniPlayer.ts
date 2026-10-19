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

const ratio = (position: number, duration: number): number =>
    duration > 0 ? Math.min(1, position / duration) : 0;

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

/** 主頁 mini player：只播今日（冇就最近一日）嘅節目 */
export const useMiniPlayer = (): MiniPlayerProps | null => {
    const player = usePlayer();
    const navigate = useNavigate();
    const { today, list, index, current, isLoaded, select } = useTodaySelection();
    if (!current) {
        return null;
    }

    const saved = getProgress(current.url);
    const position = isLoaded ? player.currentTime : (saved?.position ?? 0);
    const duration = isLoaded ? player.duration : (saved?.duration ?? 0);
    const timeText = miniPlayerTimeText(position, duration);

    return {
        showName: showName(current),
        theme: themeFor(current.showId),
        subtitle: miniPlayerSubtitle(current.date, today, timeText),
        timeText,
        isPlaying: isLoaded && player.isPlaying,
        progress: ratio(position, duration),
        labels: list.map(showName),
        index,
        onToggle: () =>
            void (isLoaded ? player.toggle() : player.load(current, { autoplay: true })),
        onOpen: () => navigate(`/show/${current.showId}`),
        onChange: select,
    };
};
