interface ScrollView {
    /** 捲動 panel 喺畫面嘅頂（getBoundingClientRect） */
    top: number;
    height: number;
    scrollTop: number;
}

interface RowBox {
    top: number;
    height: number;
}

/**
 * 等同 scrollIntoView({ block: 'nearest' })，但只計 panel 自己嘅 scrollTop：
 * 已經睇得晒就唔郁，喺上面就捲到行頂，喺下面就捲到行底。
 * 唔用 scrollIntoView 係因為佢會連埋 page / overflow: hidden 嘅祖先一齊捲。
 */
export const nearestScrollTop = (view: ScrollView, row: RowBox): number => {
    const above = row.top - view.top;
    const below = row.top + row.height - (view.top + view.height);
    if (above < 0) return view.scrollTop + above;
    if (below > 0) return view.scrollTop + below;
    return view.scrollTop;
};

/** 捲到頂時頂上露出上一行幾多（佢高度嘅比例），一睇就知上面仲有 */
export const PEEK_RATIO = 0.5;

/** 將某一行捲到 panel 頂，頂上留 peek px 露出上一行；唔會捲過清單頂 */
export const peekScrollTop = (view: ScrollView, row: RowBox, peek: number): number =>
    Math.max(0, view.scrollTop + row.top - view.top - peek);

/** 將 panel 入面嘅某一行（li）捲到頂，露出半行上一行（只捲 panel，唔會捲成頁） */
export const scrollRowToTop = (
    panel: HTMLElement,
    row: Element,
    behavior: ScrollBehavior,
): void => {
    const view = panel.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const previous = row.previousElementSibling?.getBoundingClientRect().height ?? 0;
    const top = peekScrollTop(
        { top: view.top, height: panel.clientHeight, scrollTop: panel.scrollTop },
        { top: box.top, height: box.height },
        previous * PEEK_RATIO,
    );
    panel.scrollTo?.({ top, behavior });
};

/** 將 panel 入面嘅某一行捲入可見範圍（只捲 panel，唔會捲成頁） */
export const scrollRowIntoPanel = (
    panel: HTMLElement,
    row: Element,
    behavior: ScrollBehavior,
): void => {
    const view = panel.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const top = nearestScrollTop(
        { top: view.top, height: panel.clientHeight, scrollTop: panel.scrollTop },
        { top: box.top, height: box.height },
    );
    panel.scrollTo?.({ top, behavior });
};

/** chip 喺 panel 入面置中要捲到幾多（scrollLeft）；chipLeft 係 chip 相對 panel 可見範圍左邊 */
export const centredScrollLeft = (
    view: { scrollLeft: number; width: number },
    chip: { left: number; width: number },
): number => view.scrollLeft + chip.left - (view.width - chip.width) / 2;

/**
 * 將橫向 panel 入面嘅某一格捲到正中（只捲 panel，唔會捲成頁）。
 * 用 bounding rect 唔用 offsetLeft：offsetLeft 係對住最近有 position 嘅祖先（例如成頁 .scope）計
 */
export const scrollChipToCentre = (
    panel: HTMLElement,
    chip: HTMLElement,
    behavior: ScrollBehavior,
): void => {
    const view = panel.getBoundingClientRect();
    const box = chip.getBoundingClientRect();
    const left = centredScrollLeft(
        { scrollLeft: panel.scrollLeft, width: panel.clientWidth },
        { left: box.left - view.left, width: box.width },
    );
    panel.scrollTo?.({ left, behavior });
};
