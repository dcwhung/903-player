import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MiniPlayerProps } from '../components/MiniPlayer/MiniPlayer';
import { dramaEpisodeTheme } from '../config/dramaThemes';
import { findDrama } from '../config/dramas';
import { themeFor } from '../config/showThemes';
import { findShow } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import { dramaEpisodeLabel } from '../selectors/dramas';
import { miniPlayerSubtitle, miniPlayerTimeText } from '../selectors/miniPlayer';
import { todayRecordings } from '../selectors/recordings';
import { getProgress } from '../services/progressStore';
import type { DramaEpisode } from '../types/drama';
import type { Recording } from '../types/recording';
import { isDramaEpisode } from '../types/track';
import { t } from '../i18n/t';
import { hkToday } from '../utils/date';
import { useRefreshedOn } from './useRefreshedOn';
import { ratio } from '../utils/ratio';

const showName = (recording: Recording): string => findShow(recording.showId)?.name ?? '';

/** 今日（今日冇節目播先用最近一日）節目入面揀中邊個：有載入就跟 player，否則跟用戶揀 */
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
    const saved = useRefreshedOn(
        () => (url && !isLoaded ? getProgress(url) : undefined),
        [url, isLoaded, player.watchedRevision],
    );
    return isLoaded
        ? { position: player.currentTime, duration: player.duration }
        : { position: saved?.position ?? 0, duration: saved?.duration ?? 0 };
};

type Player = ReturnType<typeof usePlayer>;

/** 載入咗廣播劇：mini player 只顯示嗰套劇（得一個，唔使左右掃），撳入劇集頁 */
const dramaMiniPlayer = (
    episode: DramaEpisode,
    player: Player,
    open: (path: string) => void,
): MiniPlayerProps => {
    const name = findDrama(episode.dramaId)?.name ?? '';
    const timeText = miniPlayerTimeText(player.currentTime, player.duration);
    const label = dramaEpisodeLabel(episode);
    return {
        showName: name,
        region: t('miniPlayer.regionDrama'),
        openLabel: t('miniPlayer.openDrama', { name }),
        theme: dramaEpisodeTheme(episode),
        subtitle: timeText ? t('miniPlayer.withTime', { label, time: timeText }) : label,
        timeText,
        isPlaying: player.isPlaying,
        progress: ratio(player.currentTime, player.duration),
        labels: [name],
        keys: [episode.url],
        index: 0,
        onToggle: () => void player.toggle(),
        onOpen: () => open(`/drama/${episode.dramaId}`),
        onChange: () => {},
    };
};

/**
 * 主頁 mini player：今日（今日冇節目播先用最近一日）嘅節目；
 * 載入緊廣播劇就改為顯示嗰套劇（返主頁唔會停，見 useHomeArrival）
 */
export const useMiniPlayer = (): MiniPlayerProps | null => {
    const player = usePlayer();
    const navigate = useNavigate();
    const { today, list, index, current, isLoaded, select } = useTodaySelection();
    const { position, duration } = useShownTime(current?.url, isLoaded);
    if (player.recording && isDramaEpisode(player.recording)) {
        return dramaMiniPlayer(player.recording, player, navigate);
    }
    if (!current) {
        return null;
    }
    const timeText = miniPlayerTimeText(position, duration);

    return {
        showName: showName(current),
        region: t('miniPlayer.region'),
        openLabel: t('miniPlayer.open', { name: showName(current) }),
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
