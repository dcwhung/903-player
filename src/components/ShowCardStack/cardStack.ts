import { SWIPE_THRESHOLD_PX, type SwipeDirection, wrapIndex } from '../../hooks/swipe';

/** 拖過卡闊嘅 30% 放手就轉節目 */
export const COMMIT_DISTANCE_RATIO = 0.3;
/** 未夠遠但甩得夠快（px/ms）都轉節目 */
export const FLICK_VELOCITY_PX_PER_MS = 0.5;
/** 計甩動速度只睇最近呢段時間，停低咗再放手就唔算甩 */
export const VELOCITY_WINDOW_MS = 100;
/** 每拖咁多 px 轉 1°，最多轉 MAX_ROTATE_DEG */
export const ROTATE_DIVISOR_PX = 20;
export const MAX_ROTATE_DEG = 15;
/** 向右拖時上一張卡由左邊探入嚟嘅比例（放手轉節目先完全飛入） */
export const RETURN_PEEK_RATIO = 0.3;
/** 飛走 / 彈返嘅時間：要同 tokens.css 嘅 --duration-card-fly / --duration-card-spring 一致 */
export const CARD_FLY_MS = 280;
export const CARD_SPRING_MS = 320;
/** 疊喺後面嘅卡最多幾多張 */
const MAX_BEHIND = 2;

export interface DragSample {
    x: number;
    t: number;
}

/** 至少要拖咁遠先轉節目；量唔到卡闊（例如未 layout）都唔會細過普通 swipe 門檻 */
const commitDistance = (width: number): number =>
    Math.max(width * COMMIT_DISTANCE_RATIO, SWIPE_THRESHOLD_PX);

/** 放手時決定轉去邊：拖得夠遠，或者同方向甩得夠快（都要過普通 swipe 門檻）；否則彈返 */
export const releaseDirection = (
    dx: number,
    velocity: number,
    width: number,
): SwipeDirection | null => {
    const distance = Math.abs(dx);
    const isFar = distance >= commitDistance(width);
    const isFlick =
        distance >= SWIPE_THRESHOLD_PX &&
        Math.abs(velocity) >= FLICK_VELOCITY_PX_PER_MS &&
        Math.sign(velocity) === Math.sign(dx);
    if (dx === 0 || !(isFar || isFlick)) return null;
    return dx < 0 ? 'next' : 'previous';
};

/** 拖動時卡嘅傾斜角度（°），同拖動距離成正比，有上限 */
export const cardRotation = (dx: number): number =>
    Math.min(MAX_ROTATE_DEG, Math.max(-MAX_ROTATE_DEG, dx / ROTATE_DIVISOR_PX));

/** 拖到幾成（0–1）：去到轉節目門檻就係 1，用嚟推後面嘅卡上前 */
export const dragProgress = (dx: number, width: number): number =>
    Math.min(1, Math.abs(dx) / commitDistance(width));

/** 後面疊住嘅卡（下一個、再下一個）同準備由左邊飛返入嚟嘅上一個；唔會重複目前節目 */
export const stackSlots = (
    index: number,
    total: number,
): { behind: number[]; incoming: number | null } => {
    const depth = Math.min(MAX_BEHIND, total - 1);
    const behind = Array.from({ length: Math.max(0, depth) }, (_, i) => (index + i + 1) % total);
    return { behind, incoming: total > 1 ? wrapIndex(index, total, 'previous') : null };
};

/** translateX 喺 matrix() 係第 5 個值，喺 matrix3d() 係第 13 個值 */
const TRANSLATE_X_INDEX: Readonly<Record<string, number>> = { matrix: 4, matrix3d: 12 };

/**
 * 由 getComputedStyle 嘅 transform 讀橫向位移：支援 matrix(a, b, c, d, e, f) 同 matrix3d(…16 個值)
 * （瀏覽器開咗 GPU 合成有時會畀 3D）；冇 transform 或者睇唔明就係 0
 */
export const translateXOf = (transform: string): number => {
    const match = /^(matrix3d|matrix)\(([^)]+)\)$/.exec(transform);
    const index = match?.[1] === undefined ? undefined : TRANSLATE_X_INDEX[match[1]];
    const x = index === undefined ? NaN : Number(match?.[2]?.split(',')[index]);
    return Number.isFinite(x) ? x : 0;
};

/** 加一個拖動樣本，順手掉走速度窗口以外嘅舊樣本 */
export const pushSample = (samples: DragSample[], sample: DragSample): DragSample[] =>
    [...samples, sample].filter((s) => sample.t - s.t <= VELOCITY_WINDOW_MS);

/** 最近樣本嘅橫向速度（px/ms，負數 = 向左） */
export const velocityOf = (samples: DragSample[]): number => {
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last || last.t <= first.t) return 0;
    return (last.x - first.x) / (last.t - first.t);
};
