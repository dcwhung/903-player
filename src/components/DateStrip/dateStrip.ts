import { SWIPE_THRESHOLD_PX, type SwipeDirection } from '../../hooks/swipe';
import { t } from '../../i18n/t';
import type { Recording } from '../../types/recording';
import { formatDateLabel } from '../../utils/date';

/** 日子條兩邊嘅日期標籤；去到盡頭嗰邊就冇 */
export interface StripNeighbours {
    newer?: string;
    older?: string;
}

/** 放手嗰下嘅手勢：dx / dy（px）、拖咗幾耐（ms）、日子條闊度（未量到係 0） */
export interface StripGesture {
    dx: number;
    dy: number;
    ms: number;
    width: number;
}

/** 三格闊度：兩邊各 25%，中間 50%（DateStrip.module.css 要同步） */
const SIDE_SHARE = 0.25;
const CENTRE_SHARE = 0.5;
/** 快速一撥：速度 ≥ 0.5 px/ms 而且最少郁咗 16px（避免手指一 tap 就當撥） */
const FLICK_VELOCITY = 0.5;
const FLICK_MIN_PX = 16;
/** 拖向冇集數嗰邊：只跟手指郁三成，似橡筋 */
const RUBBER_BAND = 0.3;
/** 碟轉正：一圈 360 度，轉集時最少順時針轉半圈先停 */
const FULL_TURN_DEG = 360;
const MIN_UPRIGHT_TURN_DEG = 180;

/** 向左掃（next）= 舊一集，向右掃（previous）= 新一集，同 adjacentEpisodeUrl 一致 */
export const neighbourFor = (neighbours: StripNeighbours, direction: SwipeDirection) =>
    direction === 'next' ? neighbours.older : neighbours.newer;

const dragDirection = (dx: number): SwipeDirection => (dx < 0 ? 'next' : 'previous');

/** 集數係最新喺頂：上一行 = 新一集，下一行 = 舊一集；搵唔到而家嗰集就兩邊都冇 */
export const stripNeighbours = (
    episodesNewestFirst: readonly Pick<Recording, 'url' | 'date'>[],
    currentUrl: string | undefined,
): StripNeighbours => {
    const index = episodesNewestFirst.findIndex((r) => r.url === currentUrl);
    if (index < 0) return {};
    const newer = episodesNewestFirst[index - 1];
    const older = episodesNewestFirst[index + 1];
    return {
        ...(newer ? { newer: formatDateLabel(newer.date) } : {}),
        ...(older ? { older: formatDateLabel(older.date) } : {}),
    };
};

/** 側格箭咀：指向嗰集喺邊（新一集喺左），純裝飾，窄螢幕會收埋 */
export const sideCellChevron = (direction: SwipeDirection): string =>
    t(direction === 'next' ? 'episodes.olderChevron' : 'episodes.newerChevron');

/** 側格掣嘅名（包含可見日期，符合 label-in-name） */
export const sideCellLabel = (direction: SwipeDirection, date: string): string =>
    t(direction === 'next' ? 'episodes.older' : 'episodes.newer', { date });

/**
 * 放手決定：拖過半格側格、或者快速一撥就算想轉（direction）；
 * 嗰邊有集數先真係轉（commit），盡頭就彈返原位。上下為主嘅移動唔算。
 */
export const stripRelease = (
    { dx, dy, ms, width }: StripGesture,
    neighbours: StripNeighbours,
): { direction: SwipeDirection | null; commit: boolean } => {
    const distance = Math.abs(dx);
    // 未量到闊度（例如未 layout）就用返通用 swipe 門檻
    const threshold = width > 0 ? (width * SIDE_SHARE) / 2 : SWIPE_THRESHOLD_PX;
    const flick = distance >= FLICK_MIN_PX && distance / Math.max(ms, 1) >= FLICK_VELOCITY;
    if (distance <= Math.abs(dy) || (distance < threshold && !flick)) {
        return { direction: null, commit: false };
    }
    const direction = dragDirection(dx);
    return { direction, commit: neighbourFor(neighbours, direction) !== undefined };
};

/** 拖緊嘅位移：有集數嗰邊跟足手指，冇嗰邊加阻力 */
export const stripOffset = (dx: number, neighbours: StripNeighbours): number =>
    neighbourFor(neighbours, dragDirection(dx)) === undefined ? dx * RUBBER_BAND : dx;

/** 轉集時成條滑幾遠：中格中心去側格中心（next 向左滑） */
export const stripShift = (width: number, direction: SwipeDirection): number => {
    const distance = (width * (SIDE_SHARE + CENTRE_SHARE)) / 2;
    return direction === 'next' ? -distance : distance;
};

/** 轉集時碟順時針轉去下一個「正」嘅角度（360 倍數），最少轉半圈，轉完節目圖一定擺正 */
export const uprightSpin = (deg: number): number =>
    Math.ceil((deg + MIN_UPRIGHT_TURN_DEG) / FULL_TURN_DEG) * FULL_TURN_DEG;
