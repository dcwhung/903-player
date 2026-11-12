/*
 * 「曾經上過架」索引（admin 列表分「未上架」/「已下架」用）：每次 request 由最新 ok publish 計一次。
 * 劇集 / 短篇睇 publishes.episode_ids（鎖住嘅 ID = 上架過、仲喺 document 嘅集數，見 lockedEpisodeIds），
 * 節目冇 episode ID，睇 document 有冇佢（同 DELETE 守衛一致）
 */
import type { LatestPublish } from '../catalog/store';

export interface PublishedIndex {
    shows: ReadonlySet<string>;
    /** 劇 ID → 有鎖住集數嘅短篇 ID（每日播嘅第三段係日子，唔會對到短篇） */
    dramas: ReadonlyMap<string, ReadonlySet<string>>;
}

const EPISODE_ID_PARTS = { prefix: 0, drama: 1, arc: 2 } as const;

const dramasOf = (episodeIds: readonly string[]): Map<string, Set<string>> => {
    const dramas = new Map<string, Set<string>>();
    episodeIds.forEach((episodeId) => {
        // drama:<劇 ID>:<短篇 ID>:<集數>（ID 合 ID_PATTERN，冇冒號）
        const parts = episodeId.split(':');
        const dramaId = parts[EPISODE_ID_PARTS.drama];
        if (parts[EPISODE_ID_PARTS.prefix] !== 'drama' || dramaId === undefined) return;
        const arcs = dramas.get(dramaId) ?? new Set<string>();
        const arcId = parts[EPISODE_ID_PARTS.arc];
        if (arcId !== undefined) arcs.add(arcId);
        dramas.set(dramaId, arcs);
    });
    return dramas;
};

const showsOf = (document: string): Set<string> => {
    try {
        const shows = (JSON.parse(document) as { shows?: unknown }).shows;
        return new Set(
            (Array.isArray(shows) ? (shows as unknown[]) : []).flatMap((show) =>
                typeof show === 'object' &&
                show !== null &&
                'id' in show &&
                typeof show.id === 'string'
                    ? [show.id]
                    : [],
            ),
        );
    } catch {
        return new Set();
    }
};

export const publishedIndexOf = (latest: LatestPublish | null): PublishedIndex =>
    latest
        ? { shows: showsOf(latest.document), dramas: dramasOf(latest.episodeIds) }
        : { shows: new Set(), dramas: new Map() };

export const isInIndex = (index: PublishedIndex, kind: 'shows' | 'dramas', id: string): boolean =>
    kind === 'shows' ? index.shows.has(id) : index.dramas.has(id);
