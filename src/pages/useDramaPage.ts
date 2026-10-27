import { useEffect, useMemo, useState } from 'react';
import { stripDays } from '../components/DateStrip/dateStrip';
import { dailyEpisodesOf, dramaEpisodeTheme, seriesEpisodesOf, type DramaConfig } from '../dramas';
import { useEpisodePress } from '../hooks/useEpisodePress';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { isFirstSeriesVisit, useStartDrama } from '../hooks/useStartDrama';
import { usePlayer } from '../player/usePlayer';
import {
    dailyNewestFirst,
    episodesInArc,
    isEpisodeOfDrama,
    pickDailyStart,
    pickSeriesStart,
} from '../selectors/dramas';
import { arcGroups, arcSummaries, type ArcSummary } from '../selectors/arcProgress';
import { getProgressMap, type Progress } from '../services/progressStore';
import type { DramaEpisode, SeriesEpisode } from '../types/drama';
import type { Track } from '../types/track';
import { hkToday } from '../utils/date';
import {
    playbackStateOf,
    type PlaybackLineState,
    type PlaybackState,
} from '../utils/playbackState';
import { toDailyItems, toSeriesItems } from './dramaItems';
import type { RowContext } from './episodeItems';

/** player 載入緊呢套劇、呢款（kind）嘅一集；未載入（或者載入緊其他嘢）係 null */
const useLoadedEpisode = <K extends DramaEpisode['kind']>(
    drama: DramaConfig,
    kind: K,
): Extract<DramaEpisode, { kind: K }> | null => {
    const { recording } = usePlayer();
    const isThis = (track: Track | null): track is Extract<DramaEpisode, { kind: K }> =>
        isEpisodeOfDrama(track, drama.id) && track.kind === kind;
    return isThis(recording) ? recording : null;
};

/**
 * 直接開呢頁（例如 deep link / mini player）時都自動播放，同節目頁一樣；
 * skip（已經載入咗呢套劇，或者第一次入短篇劇集）就唔播
 */
const useAutoplayDrama = (drama: DramaConfig, skip: boolean) => {
    const startDrama = useStartDrama();
    useEffect(() => {
        if (!skip) {
            startDrama(drama);
        }
    }, [drama, skip, startDrama]);
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
    // 暫停 / 未開始唔再講「播放中」（未載入就當未開始）
    const playState = playbackStateOf({
        isPlaying,
        position: isLoaded ? player.currentTime : 0,
    });
    const ctx: RowContext = {
        currentUrl,
        // 未載入呢套劇：player 時間係其他嘢（或者冇嘢）嘅，揀中集用返 localStorage 進度，唔講「連線中…」
        live: isLoaded ? { currentTime: player.currentTime, duration: player.duration } : undefined,
        progressMap,
        isPlaying,
        liveState: playState,
    };
    return { ctx, playState, ...useEpisodePress(episodes, currentUrl, isPlaying) };
};

/** 每日劇集頁（例如 18 樓 C 座）：同節目頁一樣，唱片 + 日子條 + 集數清單 */
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
        theme: drama.theme,
        current,
        strip,
        items: toDailyItems(episodes, ctx),
        selectEpisode,
        pressEpisode,
    };
};

/**
 * 入頁嗰下係咪第一次入呢套短篇劇集（入頁時讀一次就定，揀咗 / 播咗都唔再變）：
 * 係就唔自動播、一入嚟就開全集表
 */
const useFirstVisitOnEntry = (drama: DramaConfig): boolean => {
    const { recording } = usePlayer();
    const [firstVisit] = useState(() => isFirstSeriesVisit(drama, getProgressMap(), recording));
    return firstVisit;
};

/** 揀咗睇邊個短篇；未揀（或者揀返播緊嗰個）就跟播緊嗰集嘅短篇 */
const useViewedArc = (playingArc: string | undefined) => {
    const [picked, setPicked] = useState<string | null>(null);
    return { arc: picked ?? playingArc, pickArc: setPicked };
};

/** 全集一覽表 / chips 嘅次序：播放中 → 新上架 → 未聽完 → 已聽完（today 每次 render 重新攞） */
const useArcOrder = (
    episodes: readonly SeriesEpisode[],
    progressMap: Readonly<Record<string, Progress>>,
    loadedArc: string | undefined,
) => {
    const today = hkToday();
    const groups = useMemo(
        () => arcGroups(arcSummaries(episodes, progressMap, today), loadedArc),
        [episodes, progressMap, today, loadedArc],
    );
    const chips = useMemo(
        () => groups.flatMap((g) => g.items).map(({ arc, isNew }) => ({ arc, isNew })),
        [groups],
    );
    return { groups, chips };
};

/**
 * 全集一覽表嘅動作：撳行轉去嗰個短篇；撳右邊掣播嗰個短篇（播緊嗰個就暫停 / 繼續），
 * 兩樣都會收埋表、內頁跳去嗰個短篇
 */
const useArcSheetActions = (
    loaded: SeriesEpisode | null,
    pickArc: (arc: string) => void,
    setOpen: (open: boolean) => void,
) => {
    const player = usePlayer();
    const pick = (arc: string) => {
        pickArc(arc);
        setOpen(false);
    };
    const play = (summary: ArcSummary) => {
        if (loaded?.arc === summary.arc) void player.toggle();
        else void player.load(summary.resume, { autoplay: true });
        pick(summary.arc);
    };
    return { openSheet: () => setOpen(true), close: () => setOpen(false), pick, play };
};

/**
 * 揀短篇：播緊就淨係換清單（碟面、時間照跟播緊嗰集）；
 * 冇播放就順便載入嗰個短篇嘅續聽集（唔自動播），碟面同時間即刻跟住轉
 */
const useArcPick = (
    groups: readonly { items: readonly ArcSummary[] }[],
    setArc: (arc: string) => void,
) => {
    const player = usePlayer();
    return (arc: string) => {
        setArc(arc);
        if (player.isPlaying) return;
        const resume = groups.flatMap((g) => g.items).find((s) => s.arc === arc)?.resume;
        if (resume) void player.load(resume);
    };
};

/**
 * 未載入呢套劇（第一次入未揀，或者播緊其他嘢）：唱片區（時間、掣、「現正播放」）係未開始樣，
 * 撳播放（start）先開始播呢套劇、換走其他嘢；載入咗就跟返 player（start 係 undefined）
 */
const useStandby = (drama: DramaConfig, isLoaded: boolean, playState: PlaybackState) => {
    const startDrama = useStartDrama();
    const status: PlaybackLineState = isLoaded ? playState : 'unloaded';
    return { status, start: isLoaded ? undefined : () => startDrama(drama) };
};

/**
 * 全集表開唔開（第一次入一入嚟就開）+ 聽歌進度：
 * 轉集、有集數聽完、打開全集表都重新讀 localStorage（所以 sheetOpen 要喺 progressMap 之前）
 */
const useSeriesSheet = (firstVisit: boolean, loadedUrl: string | undefined) => {
    const [sheetOpen, setSheetOpen] = useState(firstVisit);
    const { watchedRevision } = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [watchedRevision, loadedUrl, sheetOpen]);
    return { sheetOpen, setSheetOpen, progressMap };
};

/** 橫版「現正播放：短篇 · 第 N / M 集」：M = 個短篇有幾多集；N 按排位計（有第零集都係 1 起） */
const arcCounter = (episodes: readonly SeriesEpisode[], current: SeriesEpisode | undefined) => {
    const arcEpisodes = current ? episodesInArc(episodes, current.arc) : [];
    return {
        arcTotal: arcEpisodes.length,
        arcPosition: arcEpisodes.findIndex((e) => e.url === current?.url) + 1,
    };
};

/** 揀緊睇邊個短篇、chips / 全集表次序，同嗰個短篇要列出嘅集數 */
const useSeriesArcs = (
    episodes: readonly SeriesEpisode[],
    progressMap: Readonly<Record<string, Progress>>,
    current: SeriesEpisode | undefined,
    loaded: SeriesEpisode | null,
) => {
    const { arc, pickArc: setArc } = useViewedArc(current?.arc);
    const { groups, chips } = useArcOrder(episodes, progressMap, loaded?.arc);
    const pickArc = useArcPick(groups, setArc);
    // 照集數次序（聽完嘅留喺原位）；入頁 / 轉集由 EpisodeList 捲到播緊嗰集
    const shown = arc ? episodesInArc(episodes, arc) : [];
    return { arc, pickArc, groups, chips, shown };
};

/** 短篇劇集頁（例如芝See菇Bi Family）：唱片 + 全集 / 短篇 chips + 嗰個短篇嘅集數 */
export const useSeriesDramaPage = (drama: DramaConfig) => {
    const episodes = useMemo(() => seriesEpisodesOf(drama.id), [drama]);
    const loaded = useLoadedEpisode(drama, 'series');
    const firstVisit = useFirstVisitOnEntry(drama);
    // 第一次入：唔自動播（亦唔打斷播緊嘅嘢），等用戶喺全集表揀
    useAutoplayDrama(drama, loaded !== null || firstVisit);
    const { sheetOpen, setSheetOpen, progressMap } = useSeriesSheet(firstVisit, loaded?.url);
    const current = loaded ?? pickSeriesStart(episodes, progressMap);
    const rows = usePlaybackRows(episodes, current, !!loaded);
    const { arc, pickArc, groups, chips, shown } = useSeriesArcs(
        episodes,
        progressMap,
        current,
        loaded,
    );
    return {
        // 碟面跟播緊（未播就係準備播）嗰集；冇播放時揀短篇會載入嗰個短篇，碟面就跟住轉
        theme: current ? dramaEpisodeTheme(current) : drama.theme,
        current,
        ...useStandby(drama, loaded !== null, rows.playState),
        ...arcCounter(episodes, current),
        arcs: chips,
        arc,
        pickArc,
        items: toSeriesItems(shown, rows.ctx),
        selectEpisode: rows.selectEpisode,
        pressEpisode: rows.pressEpisode,
        sheet: { open: sheetOpen, groups, ...useArcSheetActions(loaded, pickArc, setSheetOpen) },
    };
};
