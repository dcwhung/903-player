import type { HomeLayoutMode } from '../pages/home/homeLayoutMode';
import type { PlayerItem } from '../types/playerItem';
import { belongsTo, type InnerPage } from './pageHandle';

/**
 * 闊橫版主頁格仔入頁 / 返主頁用邊款過場（_mockups_/card-zoom-wide：① 同步、② R2、③ C1）。
 * 全部由 state 推（版面、張卡係邊個、內頁會唔會有把手），唔睇 DOM
 */

/** 主頁右邊有乜：播放卡、閂咗卡嘅把手、乜都冇（直版 / 冇 mini player） */
export type HomeSide = 'card' | 'handle' | 'none';

const SIDE = {
    split: 'card',
    fillWithHandle: 'handle',
    fill: 'none',
    stack: 'none',
} as const satisfies Record<HomeLayoutMode, HomeSide>;

export const homeSideOf = (mode: HomeLayoutMode): HomeSide => SIDE[mode];

export interface WideTileInput {
    side: HomeSide;
    /** 右邊卡顯示緊嘅節目 / 劇集（冇卡 = null） */
    card: PlayerItem | null;
    /** 格仔入嘅頁 */
    page: InnerPage;
    /** 入到頁右邊會唔會有把手（撳格會開播嘅話就冇） */
    handle: boolean;
}

/**
 * expand = 同 ⤢ 一樣張卡變成內頁；zoom-handle = 格仔 zoom，同時卡（或者主頁把手）縮入內頁把手；
 * zoom = 淨係格仔 zoom（Z3）
 */
export type WideTileMotion = 'expand' | 'zoom-handle' | 'zoom';

/** 張卡就係呢頁：今日節目頁唔係播放卡嘅頁（⤢ 入節目頁），冇得變形，照 zoom */
const cardIsPage = (card: PlayerItem | null, page: InnerPage): boolean =>
    card !== null && page.kind !== 'today' && belongsTo(card, page);

export const wideTileMotion = ({ side, card, page, handle }: WideTileInput): WideTileMotion => {
    if (side === 'card' && cardIsPage(card, page)) return 'expand';
    return side !== 'none' && handle ? 'zoom-handle' : 'zoom';
};

export interface WideBackInput {
    /** 入頁嗰個 history entry 有冇 zoom 來源（W-527） */
    zoomed: boolean;
    /** 內頁而家有冇（唔係淡出緊嘅）把手 */
    handle: boolean;
    /** 返到主頁右邊會有乜 */
    side: HomeSide;
}

/**
 * back = 成頁縮做右邊卡（⤢ 入頁倒轉，R2）；unzoom-handle = 倒 zoom，同時把手放大返做卡（或者主頁把手）；
 * unzoom = 淨係倒 zoom（閂咗卡，C1）
 */
export type WideBackMotion = 'back' | 'unzoom-handle' | 'unzoom';

export const wideBackMotion = ({ zoomed, handle, side }: WideBackInput): WideBackMotion => {
    if (!zoomed) return 'back';
    if (handle && side !== 'none') return 'unzoom-handle';
    return side === 'card' ? 'back' : 'unzoom';
};
