import type { PlayerItem } from '../../types/playerItem';
import type { HomeLayoutMode } from './homeLayoutMode';

export type WideLayoutMode = Exclude<HomeLayoutMode, 'stack'>;

/**
 * 闊橫版主頁右邊顯示緊乜：版面 + 張卡係邊個節目 / 劇集。
 * 節目唔計日子：同一個節目另一集（卡入面集數清單）唔算換咗
 */
export interface CardFace {
    mode: WideLayoutMode;
    kind: PlayerItem['kind'] | undefined;
    id: string | undefined;
}

export const cardFace = (mode: WideLayoutMode, item: PlayerItem | undefined): CardFace => ({
    mode,
    kind: item?.kind,
    id: item?.id,
});

export const sameCardFace = (a: CardFace, b: CardFace): boolean =>
    a.mode === b.mode && a.kind === b.kind && a.id === b.id;

/** 張卡由冇變有（冇卡 / 得把手 → 有卡） */
const opens = (from: CardFace, to: CardFace): boolean =>
    from.mode !== 'split' && to.mode === 'split';

/**
 * 張卡一直喺度但換咗節目 / 劇集。今日節目之間（節目 → 節目）只會係卡入面左右掃 / 撳指示點轉，唔反轉；
 * 主頁原地開播另一樣嘢實際係廣播劇格 ▶ 繼續收聽（劇 → 劇、節目 → 劇）
 */
const switches = (from: CardFace, to: CardFace): boolean =>
    from.mode === 'split' &&
    to.mode === 'split' &&
    (from.kind !== to.kind || from.id !== to.id) &&
    !(from.kind === 'show' && to.kind === 'show');

/**
 * 由顯示緊嘅（from）轉去最新（to）要做邊款過場：
 * open = 張卡由右 slide 入 + 淡入（O1）；switch = 成張卡反轉（S3）；null = 即刻轉
 */
export const cardMotion = (from: CardFace, to: CardFace): 'open' | 'switch' | null => {
    if (opens(from, to)) return 'open';
    return switches(from, to) ? 'switch' : null;
};
