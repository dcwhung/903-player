import type { DramaConfig } from '../dramas';
import type { Progress } from '../services/progressStore';
import type { DramaEpisode } from '../types/drama';

/**
 * 劇名排序用香港中文 collation：ICU 預設按筆劃
 * （十八樓C座 → 少爺占系列 → 芝See菇BiFamily → 森美小儀系列 → 黃金少年）
 */
const DRAMA_NAME_LOCALE = 'zh-HK';
const byStrokes = new Intl.Collator(DRAMA_NAME_LOCALE).compare;

/** 冇 addedAt 當最舊：空字串排喺所有 YYYY-MM-DD 前面 */
const OLDEST_ADDED_AT = '';
/** 唔係收聽中嘅劇唔比收聽時間（大家一樣，直接跌落 addedAt） */
const NOT_LISTENING_AT = 0;

/** 主頁劇集格次序：收聽中 → 未聽過 → 全部聽完 */
const SHELF_RANK = { listening: 0, unheard: 1, finished: 2 } as const;
type ShelfRank = (typeof SHELF_RANK)[keyof typeof SHELF_RANK];

export type ShelfDrama = Pick<DramaConfig, 'id' | 'name' | 'addedAt'>;

interface ShelfKey {
    rank: ShelfRank;
    listenedAt: number;
    addedAt: string;
}

/** 一套劇喺主頁嘅位置：有進度但未全部聽完係收聽中（記低最近聽嘅時間），全部聽完排最尾 */
const shelfKey = (
    drama: ShelfDrama,
    episodes: readonly DramaEpisode[],
    progressMap: Readonly<Record<string, Progress>>,
): ShelfKey => {
    const touched = episodes.flatMap((e) => progressMap[e.url] ?? []);
    const addedAt = drama.addedAt ?? OLDEST_ADDED_AT;
    if (touched.length === 0) {
        return { rank: SHELF_RANK.unheard, listenedAt: NOT_LISTENING_AT, addedAt };
    }
    if (touched.length === episodes.length && touched.every((p) => p.watched)) {
        return { rank: SHELF_RANK.finished, listenedAt: NOT_LISTENING_AT, addedAt };
    }
    const listenedAt = Math.max(...touched.map((p) => p.updatedAt));
    return { rank: SHELF_RANK.listening, listenedAt, addedAt };
};

/**
 * 主頁廣播劇 tab 嘅次序（直版書架同橫版格一樣）：
 * 收聽中（最近聽嗰套先）→ 未聽過 → 全部聽完；同組內新上架（addedAt）先，再同就按劇名筆劃
 */
export const dramaShelfOrder = <D extends ShelfDrama>(
    dramas: readonly D[],
    episodesOf: (id: string) => readonly DramaEpisode[],
    progressMap: Readonly<Record<string, Progress>>,
): D[] =>
    dramas
        .map((drama) => ({ drama, key: shelfKey(drama, episodesOf(drama.id), progressMap) }))
        .sort(
            (a, b) =>
                a.key.rank - b.key.rank ||
                b.key.listenedAt - a.key.listenedAt ||
                b.key.addedAt.localeCompare(a.key.addedAt) ||
                byStrokes(a.drama.name, b.drama.name),
        )
        .map(({ drama }) => drama);
