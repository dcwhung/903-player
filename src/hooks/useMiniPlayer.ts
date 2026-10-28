import { useMemo, useState } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router-dom';
import type { MiniPlayerProps } from '../components/MiniPlayer/MiniPlayer';
import { dramaEpisodeTheme, findDrama } from '../dramas';
import { findShow, themeFor } from '../shows';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import { dramaEpisodeLabel } from '../selectors/dramas';
import {
    miniPlayerRecordings,
    miniPlayerSubtitle,
    miniPlayerTags,
    miniPlayerTimeText,
    type MiniPlayerTag,
} from '../selectors/miniPlayer';
import { showsOnDate } from '../selectors/recordings';
import { getProgress } from '../services/progressStore';
import type { DramaEpisode } from '../types/drama';
import type { Recording } from '../types/recording';
import type { ShowPageState } from '../types/showPageState';
import { isDramaEpisode, type Track } from '../types/track';
import { t } from '../i18n/t';
import { formatDateLabel, hkToday } from '../utils/date';
import { dismissMiniPlayer, useMiniPlayerDismissed } from './miniPlayerDismissed';
import { useRefreshedOn } from './useRefreshedOn';
import { ratio } from '../utils/ratio';
import { hasKnownDuration } from '../utils/time';

const showName = (recording: Recording): string => findShow(recording.showId)?.name ?? '';

/**
 * 今日節目（今日冇節目就冇，唔用最近一日）；載入緊清單冇嘅節目錄音（重溫舊集）就排最前，
 * 所以今日冇節目但聽緊嘢就只出聽緊嗰個。
 * 係唔係重溫睇排最前嗰集嘅日子，唔睇清單載入完未：清單未 probe 到今日嗰集時，
 * 今日節目都唔會閃「重溫」，舊集一載入就標重溫（S-506、W-485）
 */
const useListedRecordings = (loaded: Track | null) => {
    const { recordings } = useRecordings();
    const today = hkToday();
    const listed = useMemo(() => showsOnDate(recordings, today), [recordings, today]);
    const list = useMemo(() => miniPlayerRecordings(listed, loaded), [listed, loaded]);
    const first = list.length > listed.length ? list[0] : undefined;
    const rewatchUrl = first && first.date !== today ? first.url : undefined;
    return { today, list, rewatchUrl };
};

/**
 * 清單入面揀中邊個：載入咗今日節目就跟 player，否則（包括播緊重溫舊集）跟用戶揀
 */
const useTodaySelection = () => {
    const player = usePlayer();
    const { today, list, rewatchUrl } = useListedRecordings(player.recording);
    // 揀中邊個連埋當時嘅重溫舊集記低：多咗 / 換咗舊集（例如啱啱返主頁）就由第一個（重溫）開始
    const [chosen, setChosen] = useState({ index: 0, rewatchUrl });
    const chosenIndex = chosen.rewatchUrl === rewatchUrl ? chosen.index : 0;
    const loadedIndex = list.findIndex((r) => r.url === player.recording?.url);
    // 重溫舊集喺清單：左右掃只係睇今日節目（唔會自動播），撳 ▶ 先轉播
    const followsPlayer = loadedIndex >= 0 && rewatchUrl === undefined;
    const index = followsPlayer ? loadedIndex : Math.min(chosenIndex, list.length - 1);
    const current = list[index];

    // 載入咗今日節目先跟住轉集；本身播緊就繼續播
    const select = (next: number) => {
        setChosen({ index: next, rewatchUrl });
        const recording = list[next];
        if (followsPlayer && recording) {
            void player.load(recording, { autoplay: player.isPlaying });
        }
    };
    const isLoaded = current !== undefined && current.url === player.recording?.url;
    const tags = miniPlayerTags(list, rewatchUrl !== undefined, today);
    return { list, tags, index, current, isLoaded, select };
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

type Open = (path: string, options?: NavigateOptions) => void;

/** 左滑關閉：停播 + 收起；之後喺任何一頁開始播先再出返（App 層面 useRestoreMiniPlayerOnPlay） */
const useDismissal = (player: Player) => {
    const dismissed = useMiniPlayerDismissed();
    const dismiss = () => {
        player.stop();
        dismissMiniPlayer();
    };
    return { dismissed, dismiss };
};

/** 載入咗廣播劇：mini player 只顯示嗰套劇（得一個，唔使左右掃），撳入劇集頁 */
const dramaMiniPlayer = (
    episode: DramaEpisode,
    player: Player,
    open: Open,
): Omit<MiniPlayerProps, 'onDismiss'> => {
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
        isAudible: player.isAudible,
        upright: !hasKnownDuration(player.duration),
        progress: ratio(player.currentTime, player.duration),
        labels: [name],
        keys: [episode.url],
        index: 0,
        onToggle: () => void player.toggle(),
        onOpen: () => open(`/drama/${episode.dramaId}`),
        onChange: () => {},
    };
};

/** 指示點讀屏名：重溫舊集要講埋日子，同今日同一個節目分得開 */
const dotLabel = (recording: Recording, tag: MiniPlayerTag | undefined): string =>
    tag === 'rewatch'
        ? t('miniPlayer.rewatchDot', {
              name: showName(recording),
              date: formatDateLabel(recording.date),
          })
        : showName(recording);

/** 開頁掣讀屏名：重溫舊集講埋係重溫邊日 */
const openLabel = (recording: Recording, tag: MiniPlayerTag | undefined): string => {
    const name = showName(recording);
    return tag === 'rewatch'
        ? t('miniPlayer.openRewatch', { name, date: formatDateLabel(recording.date) })
        : t('miniPlayer.open', { name });
};

const rewatchPosition = (index: number, total: number) =>
    t('miniPlayer.positionRewatch', { index, total });

/** 成個播放器讀屏名：有重溫唔講「今日」；只有重溫（今日冇節目）就唔講「及今日節目」 */
const regionKey = (hasRewatch: boolean, count: number) => {
    if (!hasRewatch) return 'miniPlayer.region';
    return count > 1 ? 'miniPlayer.regionRewatch' : 'miniPlayer.regionRewatchOnly';
};

/** 讀屏名同標籤：清單有重溫舊集就成個播放器、第幾個都唔再講「今日」 */
const listLabels = (list: Recording[], tags: (MiniPlayerTag | undefined)[], index: number) => {
    const hasRewatch = tags[0] === 'rewatch';
    const current = list[index];
    return {
        region: t(regionKey(hasRewatch, list.length)),
        openLabel: current ? openLabel(current, tags[index]) : '',
        labels: list.map((r, i) => dotLabel(r, tags[i])),
        tags,
        positionLabel: hasRewatch ? rewatchPosition : undefined,
    };
};

type MiniPlayerContent = Omit<MiniPlayerProps, 'onDismiss'>;

/** useTodaySelection 揀中咗節目（current 一定有） */
type ShowSelection = ReturnType<typeof useTodaySelection> & { current: Recording };

/** 撳入節目頁：帶埋顯示緊嗰集，同一個節目有重溫又有今日都開到啱嗰集（S-507） */
const openShow = (recording: Recording, open: Open) => {
    const state: ShowPageState = { url: recording.url };
    open(`/show/${recording.showId}`, { state });
};

/** 今日節目 / 重溫舊集：未載入就用存低嘅進度，撳 ▶ 先載入播放，撳入節目頁 */
const showMiniPlayer = (
    { list, tags, index, current, isLoaded, select }: ShowSelection,
    { position, duration }: ReturnType<typeof useShownTime>,
    player: Player,
    open: Open,
): MiniPlayerContent => {
    const timeText = miniPlayerTimeText(position, duration);
    return {
        ...listLabels(list, tags, index),
        showName: showName(current),
        theme: themeFor(current.showId),
        subtitle: miniPlayerSubtitle(current.date, timeText),
        timeText,
        isPlaying: isLoaded && player.isPlaying,
        // 只係顯示緊（未載入）嗰個唔轉；擺正用同大碟一樣嘅未知時長規則
        isAudible: isLoaded && player.isAudible,
        upright: !hasKnownDuration(duration),
        progress: ratio(position, duration),
        keys: list.map((r) => r.url),
        index,
        onToggle: () =>
            void (isLoaded ? player.toggle() : player.load(current, { autoplay: true })),
        onOpen: () => openShow(current, open),
        onChange: select,
    };
};

/**
 * 主頁 mini player：今日嘅節目（冇就唔出），載入緊其他節目錄音就排最前做「重溫」；
 * 載入緊廣播劇就改為顯示嗰套劇（返主頁都唔會停，見 useHomeArrival）
 */
const useMiniPlayerContent = (): MiniPlayerContent | null => {
    const player = usePlayer();
    const navigate = useNavigate();
    const selection = useTodaySelection();
    const time = useShownTime(selection.current?.url, selection.isLoaded);
    if (player.recording && isDramaEpisode(player.recording)) {
        return dramaMiniPlayer(player.recording, player, navigate);
    }
    const { current } = selection;
    return current ? showMiniPlayer({ ...selection, current }, time, player, navigate) : null;
};

/** 主頁 mini player；畀用戶左滑關閉咗（未再播嘢）就係 null */
export const useMiniPlayer = (): MiniPlayerProps | null => {
    const player = usePlayer();
    const content = useMiniPlayerContent();
    const { dismissed, dismiss } = useDismissal(player);
    return content && !dismissed ? { ...content, onDismiss: dismiss } : null;
};
