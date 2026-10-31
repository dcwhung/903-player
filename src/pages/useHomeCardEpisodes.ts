import type {
    EpisodeItem,
    EpisodeLabels,
    EpisodeScrollAlign,
} from '../components/EpisodeList/EpisodeList';
import { useRecordings } from '../data/useRecordings';
import { dailyEpisodesOf, seriesEpisodesOf } from '../dramas';
import { useEpisodePress } from '../hooks/useEpisodePress';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { usePlayer } from '../player/usePlayer';
import { dailyNewestFirst, episodesInArc } from '../selectors/dramas';
import { entriesNewestFirst, recordingsForShow } from '../selectors/recordings';
import { getProgressMap } from '../services/progressStore';
import type { DramaEpisode } from '../types/drama';
import type { Recording, UnavailableEpisode } from '../types/recording';
import { isDramaEpisode, type Track } from '../types/track';
import { toDailyItems, toSeriesItems } from './dramaItems';
import { toEpisodeItems, type RowContext } from './episodeItems';

/** 一張清單（同內頁一樣嘅行、行頭欄、捲法）同撳行播得嘅集 */
export interface CardEpisodeList {
    items: EpisodeItem[];
    labels: EpisodeLabels;
    scrollAlign: EpisodeScrollAlign;
    tracks: readonly Track[];
}

/** 廣播劇：短篇 = 嗰個短篇嘅集（同短篇劇集頁一樣）；每日 = 最新喺頂（同每日劇集頁一樣） */
const dramaList = (episode: DramaEpisode, ctx: RowContext): CardEpisodeList => {
    if (episode.kind === 'series') {
        const tracks = episodesInArc(seriesEpisodesOf(episode.dramaId), episode.arc);
        return { items: toSeriesItems(tracks, ctx), labels: 'title', scrollAlign: 'top', tracks };
    }
    const tracks = dailyNewestFirst(dailyEpisodesOf(episode.dramaId));
    const items = toDailyItems(tracks, ctx);
    return { items, labels: 'taggedDate', scrollAlign: 'nearest', tracks };
};

/** 節目：同節目頁清單一樣（最新喺頂，連未上架） */
const showList = (
    show: Recording,
    ctx: RowContext,
    recordings: Recording[],
    unavailable: UnavailableEpisode[],
): CardEpisodeList => {
    const entries = entriesNewestFirst(recordings, unavailable, show.showId);
    const { currentUrl, live, progressMap, isPlaying } = ctx;
    return {
        items: toEpisodeItems(entries, currentUrl, live, progressMap, isPlaying),
        labels: 'date',
        scrollAlign: 'nearest',
        tracks: recordingsForShow(recordings, show.showId),
    };
};

const EMPTY_LIST: CardEpisodeList = {
    items: [],
    labels: 'date',
    scrollAlign: 'nearest',
    tracks: [],
};

/** 顯示緊嗰集（載入咗就係 player 嗰集）同計清單行要嘅 player / 進度資料 */
const useRowContext = (url: string | undefined) => {
    const player = usePlayer();
    const isLoaded = url !== undefined && player.recording?.url === url;
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, url]);
    const ctx: RowContext = {
        currentUrl: url,
        live: isLoaded ? { currentTime: player.currentTime, duration: player.duration } : undefined,
        progressMap,
        isPlaying: isLoaded && player.isPlaying,
    };
    return { ctx, loaded: isLoaded ? player.recording : null };
};

/**
 * 主頁播放卡嘅集數清單：同內頁一模一樣（短篇 = 短篇劇集頁嗰個短篇；節目 / 每日劇 = 節目頁 / 每日劇集頁），
 * 顯示緊嗰集係揀中行、捲入畫面。撳行同內頁一樣：撳播緊嗰集暫停，其他集播嗰集（留喺主頁）
 */
export const useHomeCardEpisodes = (url: string | undefined) => {
    const { recordings, unavailable } = useRecordings();
    const { ctx, loaded } = useRowContext(url);
    const show = recordings.find((r) => r.url === url) ?? null;
    const drama = loaded && isDramaEpisode(loaded) ? loaded : null;
    const list = drama
        ? dramaList(drama, ctx)
        : show
          ? showList(show, ctx, recordings, unavailable)
          : EMPTY_LIST;
    const { pressEpisode } = useEpisodePress(list.tracks, url, ctx.isPlaying);
    const { items, labels, scrollAlign } = list;
    return { items, labels, scrollAlign, onSelect: pressEpisode };
};
