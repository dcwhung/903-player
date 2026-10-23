import { useEffect, useMemo, useState } from 'react';
import { stripDays } from '../components/DateStrip/dateStrip';
import { DRAMA_THEMES } from '../config/dramaThemes';
import type { DramaConfig } from '../config/dramas';
import { dailyEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { useStartDrama } from '../hooks/useStartDrama';
import { usePlayer } from '../player/usePlayer';
import {
    dailyNewestFirst,
    episodesInArc,
    pickDailyStart,
    pickSeriesStart,
    seriesArcs,
} from '../selectors/dramas';
import { getProgressMap } from '../services/progressStore';
import type { DramaEpisode } from '../types/drama';
import { isDramaEpisode, type Track } from '../types/track';
import { hkToday } from '../utils/date';
import { toDailyItems, toSeriesItems } from './dramaItems';
import type { RowContext } from './episodeItems';

/** player 載入緊呢套劇、呢款（kind）嘅一集；未載入（或者載入緊其他嘢）係 null */
const useLoadedEpisode = <K extends DramaEpisode['kind']>(
    drama: DramaConfig,
    kind: K,
): Extract<DramaEpisode, { kind: K }> | null => {
    const { recording } = usePlayer();
    const isThis = (track: Track | null): track is Extract<DramaEpisode, { kind: K }> =>
        track !== null &&
        isDramaEpisode(track) &&
        track.dramaId === drama.id &&
        track.kind === kind;
    return isThis(recording) ? recording : null;
};

/** 直接開呢頁（例如 deep link / mini player）時都自動播放，同節目頁一樣 */
const useAutoplayDrama = (drama: DramaConfig, isLoaded: boolean) => {
    const startDrama = useStartDrama();
    useEffect(() => {
        if (!isLoaded) {
            startDrama(drama);
        }
    }, [drama, isLoaded, startDrama]);
};

/** 清單行要嘅 player 狀態 + 撳行 / 揀集嘅動作（兩款劇集頁共用） */
const usePlaybackRows = (
    episodes: readonly DramaEpisode[],
    current: DramaEpisode | undefined,
    isLoaded: boolean,
) => {
    const player = usePlayer();
    const currentUrl = current?.url;
    // 轉集或者有集數變成聽過先重新讀 localStorage
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, currentUrl]);
    const isPlaying = isLoaded && player.isPlaying;
    const ctx: RowContext = {
        currentUrl,
        live: { currentTime: player.currentTime, duration: player.duration },
        progressMap,
        isPlaying,
    };
    const selectEpisode = (url: string) => {
        const episode = episodes.find((e) => e.url === url);
        if (episode) void player.load(episode, { autoplay: true });
    };
    // 撳播緊嗰集就暫停（掣係暫停樣），其他集就播嗰集
    const pressEpisode = (url: string) =>
        isPlaying && url === currentUrl ? void player.toggle() : selectEpisode(url);
    return { ctx, selectEpisode, pressEpisode };
};

/** 每日劇集頁（例如 18-樓-C-座）：同節目頁一樣，唱片 + 日子條 + 集數清單 */
export const useDailyDramaPage = (drama: DramaConfig) => {
    const episodes = useMemo(() => dailyNewestFirst(dailyEpisodesOf(drama.id)), [drama]);
    const loaded = useLoadedEpisode(drama, 'daily');
    useAutoplayDrama(drama, loaded !== null);
    const current = loaded ?? pickDailyStart(episodes, hkToday());
    const { ctx, selectEpisode, pressEpisode } = usePlaybackRows(episodes, current, !!loaded);
    // 重播舊集同新集隔成年：只排有集數嘅日子，唔排中間成年灰色日子
    const strip = useMemo(
        () => stripDays(episodes, current?.url, { episodeDaysOnly: true }),
        [episodes, current?.url],
    );
    return {
        theme: DRAMA_THEMES[drama.id],
        current,
        strip,
        items: toDailyItems(episodes, ctx),
        selectEpisode,
        pressEpisode,
    };
};

/** 揀咗睇邊個短篇；未揀（或者揀返播緊嗰個）就跟播緊嗰集嘅短篇 */
const useViewedArc = (playingArc: string | undefined) => {
    const [picked, setPicked] = useState<string | null>(null);
    return { arc: picked ?? playingArc, pickArc: setPicked };
};

/** 短篇劇集頁（例如芝-See-菇-Bi-Family）：唱片 + 短篇 chips + 嗰個短篇嘅集數 */
export const useSeriesDramaPage = (drama: DramaConfig) => {
    const episodes = useMemo(() => seriesEpisodesOf(drama.id), [drama]);
    const arcs = useMemo(() => seriesArcs(episodes), [episodes]);
    const loaded = useLoadedEpisode(drama, 'series');
    useAutoplayDrama(drama, loaded !== null);
    const { watchedRevision } = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [watchedRevision, loaded?.url]);
    const current = loaded ?? pickSeriesStart(episodes, progressMap);
    const { ctx, selectEpisode, pressEpisode } = usePlaybackRows(episodes, current, !!loaded);
    const { arc, pickArc } = useViewedArc(current?.arc);
    const shown = useMemo(() => (arc ? episodesInArc(episodes, arc) : []), [episodes, arc]);
    return {
        theme: DRAMA_THEMES[drama.id],
        current,
        arcs,
        arc,
        pickArc,
        items: toSeriesItems(shown, ctx),
        selectEpisode,
        pressEpisode,
    };
};
