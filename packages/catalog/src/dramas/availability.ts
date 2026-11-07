/*
 * registry 用嘅上架 / 下架工具（P8 #6）：由 drama.json 砌每個短篇嘅 ArcAvailability，
 * 同按今日判斷一集 / 一套劇出唔出。判斷規則喺 selectors/availability（pure）
 */
import { isArcUpcoming, isAvailable, isRemoved } from '../selectors/availability';
import type { ArcAvailability, DramaEpisode, EpisodeRange } from '../types/drama';
import type { ArcDefinition, DramaDefinition } from './schema';

/** 一套劇今日喺邊：missing = 唔識 / 停用；upcoming = 未上架；removed = 已下架；live = 有得聽 */
export type DramaStatus = 'live' | 'upcoming' | 'removed' | 'missing';

export interface DramaWindow {
    /** 劇集層 addedAt（將來 = 整套即將上架） */
    launchedAt?: string | undefined;
    removedAt?: string | undefined;
}

/** episodeDates（集數 → 呢集起日子）變成每批 first–last；最後一批去到短篇最後一集 */
const batchesOf = (arc: ArcDefinition): EpisodeRange[] => {
    const starts = [...arc.episodeDates];
    const lastNo = arc.firstNo + (arc.count ?? 0) - 1;
    return starts.map(([first, date], i) => ({
        first,
        last: (starts[i + 1]?.[0] ?? lastNo + 1) - 1,
        date,
    }));
};

const toArcAvailability = (def: DramaDefinition, arc: ArcDefinition): ArcAvailability => {
    const addedAt = arc.addedAt ?? def.addedAt;
    return {
        arc: arc.name,
        firstNo: arc.firstNo,
        ...(arc.count === undefined ? {} : { count: arc.count }),
        ...(addedAt ? { addedAt } : {}),
        ...(arc.removedAt ? { removedAt: arc.removedAt } : {}),
        batches: batchesOf(arc),
        removals: arc.episodeRemovedAt,
    };
};

/** 每個短篇嘅上架 / 下架資料（catalog 次序）；每日劇冇短篇 */
export const arcAvailabilityOf = (def: DramaDefinition): readonly ArcAvailability[] =>
    def.kind === 'series' ? def.arcs.map((arc) => toArcAvailability(def, arc)) : [];

/** 一套劇今日嘅狀態（enabled 已經過咗先問） */
export const windowStatus = (window: DramaWindow, today: string): DramaStatus => {
    if (isArcUpcoming(window.launchedAt, today)) return 'upcoming';
    return isRemoved(window.removedAt, today) ? 'removed' : 'live';
};

/**
 * 一集今日出唔出：短篇劇每集嘅 addedAt / removedAt 已經計埋劇集同短篇層；
 * 每日劇只有劇集層（window）
 */
export const isLiveEpisode = (episode: DramaEpisode, window: DramaWindow, today: string) =>
    episode.kind === 'series'
        ? isAvailable(episode, today)
        : isAvailable({ addedAt: window.launchedAt, removedAt: window.removedAt }, today);
