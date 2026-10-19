import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MiniPlayerProps } from '../components/MiniPlayer/MiniPlayer';
import { themeFor } from '../config/showThemes';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { t } from '../i18n/t';
import { usePlayer } from '../player/usePlayer';
import { todayRecordings } from '../selectors/recordings';
import { getProgress } from '../services/progressStore';
import { formatDateLabel, hkToday } from '../utils/date';
import { formatDuration } from '../utils/time';

const ratio = (position: number, duration: number): number =>
    duration > 0 ? Math.min(1, position / duration) : 0;

/** 主頁 mini player：只播今日（冇就最近一日）嘅節目 */
export const useMiniPlayer = (): MiniPlayerProps | null => {
    const { recordings } = useRecordings();
    const player = usePlayer();
    const navigate = useNavigate();
    const [chosen, setChosen] = useState(0);
    const today = hkToday();
    const list = useMemo(() => todayRecordings(recordings, today), [recordings, today]);

    const loadedIndex = list.findIndex((r) => r.url === player.recording?.url);
    const isLoaded = loadedIndex >= 0;
    const index = isLoaded ? loadedIndex : Math.min(chosen, list.length - 1);
    const current = list[index];
    if (!current) {
        return null;
    }

    const saved = getProgress(current.url);
    const position = isLoaded ? player.currentTime : (saved?.position ?? 0);
    const duration = isLoaded ? player.duration : (saved?.duration ?? 0);
    const dateLabel = formatDateLabel(current.date);
    const label = current.date === today ? t('miniPlayer.today', { date: dateLabel }) : dateLabel;

    return {
        showName: findShow(current.showId)?.name ?? '',
        theme: themeFor(current.showId),
        subtitle:
            duration > 0
                ? t('miniPlayer.withTime', {
                      label,
                      current: formatDuration(position),
                      total: formatDuration(duration),
                  })
                : label,
        isPlaying: isLoaded && player.isPlaying,
        progress: ratio(position, duration),
        labels: list.map((r) => findShow(r.showId)?.name ?? ''),
        index,
        onToggle: () =>
            void (isLoaded ? player.toggle() : player.load(current, { autoplay: true })),
        onOpen: () => navigate(`/show/${current.showId}`),
        onChange: (next) => {
            setChosen(next);
            const recording = list[next];
            if (isLoaded && recording) {
                void player.load(recording, { autoplay: player.isPlaying });
            }
        },
    };
};
