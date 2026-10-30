import type { EpisodeItem, EpisodeLabels } from '../components/EpisodeList/EpisodeList';
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

/** 主頁播放卡「下一集」列幾多行（mockup 4 行，卡放唔晒就自己捲） */
export const NEXT_EPISODE_COUNT = 4;

/** 一張清單（同內頁一樣嘅行）同撳行播得嘅集 */
interface EpisodeSource {
    items: EpisodeItem[];
    labels: EpisodeLabels;
    tracks: readonly Track[];
}

/** 廣播劇：短篇 = 同一個短篇嘅集（集數次序）；每日 = 最新喺頂（同劇集頁清單一樣） */
const dramaSource = (episode: DramaEpisode, ctx: RowContext): EpisodeSource => {
    if (episode.kind === 'series') {
        const tracks = episodesInArc(seriesEpisodesOf(episode.dramaId), episode.arc);
        return { items: toSeriesItems(tracks, ctx), labels: 'title', tracks };
    }
    const tracks = dailyNewestFirst(dailyEpisodesOf(episode.dramaId));
    return { items: toDailyItems(tracks, ctx), labels: 'taggedDate', tracks };
};

/** 節目：同節目頁清單一樣（最新喺頂，連未上架） */
const showSource = (
    show: Recording,
    ctx: RowContext,
    recordings: Recording[],
    unavailable: UnavailableEpisode[],
): EpisodeSource => {
    const entries = entriesNewestFirst(recordings, unavailable, show.showId);
    const { currentUrl, live, progressMap, isPlaying } = ctx;
    return {
        items: toEpisodeItems(entries, currentUrl, live, progressMap, isPlaying),
        labels: 'date',
        tracks: recordingsForShow(recordings, show.showId),
    };
};

const EMPTY_SOURCE: EpisodeSource = { items: [], labels: 'date', tracks: [] };

/** 清單入面顯示緊嗰集之後嘅幾行（搵唔到嗰集就冇） */
const itemsAfter = (items: EpisodeItem[], url: string | undefined): EpisodeItem[] => {
    const index = items.findIndex((item) => item.key === url);
    return index < 0 ? [] : items.slice(index + 1, index + 1 + NEXT_EPISODE_COUNT);
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
 * 主頁播放卡「下一集」：同內頁清單一樣嘅行（標題 / 副題、進度、狀態、▷），淨係顯示緊嗰集後面幾行；
 * 撳行就播嗰集（留喺主頁，唔入頁）
 */
export const useHomeNextEpisodes = (url: string | undefined) => {
    const { recordings, unavailable } = useRecordings();
    const { ctx, loaded } = useRowContext(url);
    const show = recordings.find((r) => r.url === url) ?? null;
    const drama = loaded && isDramaEpisode(loaded) ? loaded : null;
    const source = drama
        ? dramaSource(drama, ctx)
        : show
          ? showSource(show, ctx, recordings, unavailable)
          : EMPTY_SOURCE;
    const { pressEpisode } = useEpisodePress(source.tracks, url, ctx.isPlaying);
    return { items: itemsAfter(source.items, url), labels: source.labels, onSelect: pressEpisode };
};
