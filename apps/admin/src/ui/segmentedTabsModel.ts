/* SegmentedTabs 嘅純邏輯：方向鍵 / Home / End 換位（頭尾循環）、tab id、膠囊滑動方向 */

/** 膠囊向右（forward）定向左（back）滑：決定邊一邊先郁（CSS 拉長效果） */
export type SegmentDirection = 'forward' | 'back';

const KEY_MOVES: Record<string, (index: number, count: number) => number> = {
    ArrowRight: (index, count) => (index + 1) % count,
    ArrowLeft: (index, count) => (index - 1 + count) % count,
    Home: () => 0,
    End: (_index, count) => count - 1,
};

/** 撳 `key` 之後去邊一格；唔係導航鍵 = null */
export const nextSegmentIndex = (key: string, index: number, count: number): number | null => {
    const move = KEY_MOVES[key];
    return move ? move(index, count) : null;
};

/** tabs 模式每個 tab 嘅 id（tabpanel 用嚟 aria-labelledby） */
export const segmentTabId = (panelId: string, value: string) => `${panelId}-tab-${value}`;

export const slideDirection = (from: number, to: number): SegmentDirection =>
    to > from ? 'forward' : 'back';
