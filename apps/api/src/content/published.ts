/*
 * 「曾經上過架」（admin 列表分「未上架」/「已下架」）同 DELETE 守衛（最新 publish 有冇用緊）。
 * - 劇集 / 短篇：publishes.episode_ids（鎖住嘅 ID = 上架過、仲喺 document 嘅集數，見 lockedEpisodeIds）
 * - 節目（狀態）：任何一次 ok publish 入面 enabled 唔係 false（everListedShowIds，W-716）
 * - 節目（守衛）：最新 document 有冇佢；document 讀唔到就當有（fail closed，S-844）
 */
export interface PublishedIndex {
    shows: ReadonlySet<string>;
    /** 劇 ID → 有鎖住集數嘅短篇 ID（每日播嘅第三段係日子，唔會對到短篇） */
    dramas: ReadonlyMap<string, ReadonlySet<string>>;
}

const EPISODE_ID_PARTS = { prefix: 0, drama: 1, arc: 2 } as const;

export const dramasOf = (episodeIds: readonly string[]): Map<string, Set<string>> => {
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

const idOf = (show: unknown): string[] =>
    typeof show === 'object' && show !== null && 'id' in show && typeof show.id === 'string'
        ? [show.id]
        : [];

/** 最新 document 入面嘅節目 ID；parse 唔到 → null（叫嘅人要 fail closed） */
export const documentShowIds = (document: string): Set<string> | null => {
    try {
        const shows = (JSON.parse(document) as { shows?: unknown }).shows;
        return new Set((Array.isArray(shows) ? (shows as unknown[]) : []).flatMap(idOf));
    } catch {
        return null;
    }
};

export const isInIndex = (index: PublishedIndex, kind: 'shows' | 'dramas', id: string): boolean =>
    kind === 'shows' ? index.shows.has(id) : index.dramas.has(id);
