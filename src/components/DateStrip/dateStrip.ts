import type { SwipeDirection } from '../../hooks/swipe';
import type { Recording } from '../../types/recording';
import { addDays, daysBetween } from '../../utils/date';

/** 日子條一格一日：url = 嗰日嘅集數（冇節目係 null）；inRange = 喺最新 / 最舊一集之間（之外留空） */
export interface StripDay {
    date: string;
    url: string | null;
    inRange: boolean;
}

/** 由新到舊（左到右）嘅日子，current = 現正播放嗰日（冇集數係 -1） */
export interface StripDays {
    days: readonly StripDay[];
    current: number;
}

/** 放手嗰下嘅手勢：dx / dy（px）、拖咗幾耐（ms）、日子條闊度（未量到係 0） */
export interface StripGesture {
    dx: number;
    dy: number;
    ms: number;
    width: number;
}

/** 日子條入面撳得嘅日子掣：記住自己係第幾格（track 代理 click 用） */
export const DAY_INDEX_ATTR = 'data-day';

/** 一次見到 7 日，現正播放喺正中（第 4 格）；DateStrip.module.css 嘅 --date-strip-days 要同步 */
export const VISIBLE_DAYS = 7;
const CENTRE_SLOT = Math.floor(VISIBLE_DAYS / 2);
/** 最新一集之後、最舊一集之前各留 3 格空位，盡頭嗰集都可以擺喺正中 */
const BLANK_DAYS = CENTRE_SLOT;
/** 未量到日子條闊度（例如未 layout）：當一格 56px（390px 手機減兩邊留白 ÷ 7） */
const FALLBACK_CELL_PX = 56;
/** 郁唔夠 8px（或者主要係直向）唔當掃，留返畀 click */
const TAP_SLOP_PX = 8;
/** 快速一撥：速度 ≥ 0.5 px/ms 而且最少郁咗 16px，最少轉一集 */
const FLICK_VELOCITY = 0.5;
const FLICK_MIN_PX = 16;
/** 拖過最新 / 最舊一集：只跟手指郁三成，似橡筋 */
const RUBBER_BAND = 0.3;
/** 碟轉正：一圈 360 度，轉集時最少順時針轉半圈先停 */
const FULL_TURN_DEG = 360;
const MIN_UPRIGHT_TURN_DEG = 180;

/** 每日嘅集數：同一日有兩集就留最新嗰集（集數最新喺頂，第一個就係） */
const episodeByDate = (episodes: readonly Pick<Recording, 'url' | 'date'>[]) => {
    const byDate = new Map<string, string>();
    episodes.forEach((r) => {
        if (!byDate.has(r.date)) byDate.set(r.date, r.url);
    });
    return byDate;
};

/**
 * 日子條嘅日子：由最新一集 + 3 日排到最舊一集 − 3 日（新一集喺左，同集數清單上到下一樣）。
 * 搵唔到而家嗰集就擺最新一集喺正中
 */
export const stripDays = (
    episodesNewestFirst: readonly Pick<Recording, 'url' | 'date'>[],
    currentUrl: string | undefined,
): StripDays => {
    const newest = episodesNewestFirst[0];
    const oldest = episodesNewestFirst.at(-1);
    if (!newest || !oldest) return { days: [], current: -1 };
    const byDate = episodeByDate(episodesNewestFirst);
    const span = daysBetween(oldest.date, newest.date) + 2 * BLANK_DAYS;
    const start = addDays(newest.date, BLANK_DAYS);
    const days = Array.from({ length: span + 1 }, (_, i): StripDay => {
        const date = addDays(start, -i);
        return {
            date,
            url: byDate.get(date) ?? null,
            inRange: i >= BLANK_DAYS && i <= span - BLANK_DAYS,
        };
    });
    const currentDate = episodesNewestFirst.find((r) => r.url === currentUrl)?.date ?? newest.date;
    return { days, current: days.findIndex((d) => d.date === currentDate) };
};

const episodeIndexes = (days: readonly StripDay[]): number[] =>
    days.flatMap((day, i) => (day.url === null ? [] : [i]));

/** 一格幾闊：日子條闊度 ÷ 7；未量到用 FALLBACK_CELL_PX */
const cellWidthOf = (width: number): number =>
    width > 0 ? width / VISIBLE_DAYS : FALLBACK_CELL_PX;

/** 離 position 最近有集數嗰日；一樣近就揀 bias 方向（+1 = 右邊舊啲，-1 = 左邊新啲） */
const nearestEpisode = (days: readonly StripDay[], position: number, bias: number): number => {
    let best = -1;
    let bestDistance = Infinity;
    episodeIndexes(days).forEach((i) => {
        const distance = Math.abs(i - position);
        const tieWins = distance === bestDistance && Math.sign(i - position) === bias;
        if (distance < bestDistance || tieWins) [best, bestDistance] = [i, distance];
    });
    return best;
};

/** 方向鍵 / 快速一撥：next = 右邊舊一集，previous = 左邊新一集；盡頭就唔郁 */
export const steppedDay = (
    days: readonly StripDay[],
    current: number,
    direction: SwipeDirection,
): number => {
    const indexes = episodeIndexes(days);
    const found =
        direction === 'next'
            ? indexes.find((i) => i > current)
            : indexes.findLast((i) => i < current);
    return found ?? current;
};

/**
 * 放手：停喺邊格就揀最近有集數嗰日（冇節目 / 留空嘅日子會跳去最近一集），
 * 快速一撥最少轉一集；主要係直向或者郁唔夠就唔當掃（null）
 */
export const stripRelease = (
    { dx, dy, ms, width }: StripGesture,
    days: readonly StripDay[],
    current: number,
): number | null => {
    const distance = Math.abs(dx);
    if (distance <= Math.abs(dy) || distance < TAP_SLOP_PX) return null;
    // 向左拖（dx < 0）= 向右邊舊啲嘅日子行
    const bias = dx < 0 ? 1 : -1;
    const target = nearestEpisode(days, Math.round(current - dx / cellWidthOf(width)), bias);
    const flick = distance >= FLICK_MIN_PX && distance / Math.max(ms, 1) >= FLICK_VELOCITY;
    if (flick && target === current) return steppedDay(days, current, dx < 0 ? 'next' : 'previous');
    return target;
};

/** 拖緊嘅位移：喺最新同最舊一集之間跟足手指，拖過頭加阻力 */
export const stripOffset = (
    dx: number,
    days: readonly StripDay[],
    current: number,
    cellWidth: number,
): number => {
    const indexes = episodeIndexes(days);
    const max = (current - (indexes[0] ?? current)) * cellWidth;
    const min = (current - (indexes.at(-1) ?? current)) * cellWidth;
    if (dx > max) return max + (dx - max) * RUBBER_BAND;
    if (dx < min) return min + (dx - min) * RUBBER_BAND;
    return dx;
};

/** 拖緊時一格幾闊（px）：同 stripRelease 用同一個計法 */
export const stripCellWidth = cellWidthOf;

/** 成條嘅位置：current 擺喺正中（% 係 track 闊度 = 日子條闊度），再加拖動位移 */
export const trackTransform = (current: number, offset: number): string =>
    `translateX(calc(${CENTRE_SLOT - current} * 100% / ${VISIBLE_DAYS} + ${offset}px))`;

/** 轉集時碟順時針轉去下一個「正」嘅角度（360 倍數），最少轉半圈，轉完節目圖一定擺正 */
export const uprightSpin = (deg: number): number =>
    Math.ceil((deg + MIN_UPRIGHT_TURN_DEG) / FULL_TURN_DEG) * FULL_TURN_DEG;

/** matrix() 同 matrix3d() 嘅頭兩個值都係 cos θ、sin θ（繞 z 軸轉） */
const ROTATION_MATRIX = /^matrix(?:3d)?\(([^,]+),([^,]+),/;
const HALF_TURN_DEG = FULL_TURN_DEG / 2;

/** 由 getComputedStyle 嘅 transform 讀碟而家轉咗幾多度（-180–180）；冇 transform 或者睇唔明就係 null */
export const rotationOf = (transform: string): number | null => {
    const match = ROTATION_MATRIX.exec(transform);
    if (!match) return null;
    const [cos, sin] = [Number(match[1]), Number(match[2])];
    if (!Number.isFinite(cos) || !Number.isFinite(sin)) return null;
    return (Math.atan2(sin, cos) * HALF_TURN_DEG) / Math.PI;
};

/**
 * 同 `deg` 睇落一樣（差 360 倍數）、喺 `target` 後面一圈之內（target − 360 < 結果 ≤ target）嘅角度。
 * 碟一定係順時針轉向目標，所以接住轉緊嘅碟時揀後面嗰個，之後彈返都係順時針轉完
 */
export const behindTurn = (deg: number, target: number): number => {
    const behind = (((target - deg) % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG;
    return target - behind;
};
