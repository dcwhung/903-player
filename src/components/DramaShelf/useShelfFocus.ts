import {
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent,
    type RefObject,
} from 'react';
import { cssPx } from '../../utils/cssLength';
import { scrollBehavior } from '../../utils/motion';
import {
    focusIndexAt,
    sameShelfLayout,
    snapTop,
    tailPadding,
    tapAction,
    type ShelfMetrics,
} from './shelfFocus';
import { stackLayout, type StackLayout } from './shelfStack';

/** 書架嘅 token（tokens.css）：卡距、focus 卡上面露幾多、卡最矮 / 最高比例、疊卡間距最細 */
const TOKEN = {
    gap: '--home-tile-gap',
    peek: '--drama-shelf-peek',
    minRatio: '--drama-shelf-min-ratio',
    maxRatio: '--drama-shelf-max-ratio',
    minStep: '--drama-shelf-min-step',
} as const;

const px = (value: string): number => parseFloat(value) || 0;

interface ShelfLayout extends StackLayout, ShelfMetrics {
    /** 要捲先有：底留位，最尾一張都捲得到 snap 位 */
    tailPx?: number;
}

/**
 * 量書架（扣走留白嘅闊高）同讀 token，計疊卡點排（stackLayout）；未量到就冇。
 * 上下留白一樣（CSS .shelf 嘅 padding），底用頂嘅值：要捲時 inline padding-bottom 係底留位，唔係留白
 */
const measure = (shelf: HTMLElement, count: number): ShelfLayout | undefined => {
    const style = getComputedStyle(shelf);
    const token = (name: string) => style.getPropertyValue(name);
    const topPx = px(style.paddingTop);
    const stack = stackLayout({
        heightPx: shelf.clientHeight - 2 * topPx,
        widthPx: shelf.clientWidth - px(style.paddingLeft) - px(style.paddingRight),
        count,
        gapPx: cssPx(token(TOKEN.gap)),
        minRatio: px(token(TOKEN.minRatio)),
        maxRatio: px(token(TOKEN.maxRatio)),
        minStepPx: cssPx(token(TOKEN.minStep)),
    });
    if (!stack) return undefined;
    const metrics = { ...stack, topPx, peekPx: cssPx(token(TOKEN.peek)) };
    return stack.scrolls
        ? { ...metrics, tailPx: tailPadding(shelf.clientHeight, metrics) }
        : metrics;
};

/**
 * 變唔使捲 → 捲返頂（overflow: hidden 都會留住 scrollTop）。
 * 捲去 0 喺舊 layout 都唔會被截短，所以喺 RO callback 做得；
 * 變要捲嗰邊要等新 layout commit 先捲，見 useSnapOnScrollStart（W-465）
 */
const resetScroll = (shelf: HTMLElement, next: ShelfLayout) => {
    if (!next.scrolls) shelf.scrollTop = 0;
};

/**
 * 跟書架尺寸重新排（轉向、iOS 工具列、mini player 出入令書架變高 / 矮）；冇 ResizeObserver（jsdom）就量一次
 */
const useShelfLayout = (
    shelfRef: RefObject<HTMLElement | null>,
    count: number,
    enabled: boolean,
) => {
    const [layout, setLayout] = useState<ShelfLayout>();
    useLayoutEffect(() => {
        const shelf = shelfRef.current;
        if (!enabled || !shelf) return;
        const update = () => {
            const next = measure(shelf, count);
            if (next) resetScroll(shelf, next);
            setLayout((prev) => (sameShelfLayout(prev, next) ? prev : next));
        };
        update();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
        observer?.observe(shelf);
        return () => observer?.disconnect();
    }, [shelfRef, count, enabled]);
    return enabled ? layout : undefined;
};

/**
 * 變要捲（scrolls false → true）就捲去 focus 嗰張嘅 snap 位（W-464，T2「停喺 snap 位嗰張係 focus」）。
 * 一定要喺新 layout commit 之後（layout effect）：之前 DOM 仲係舊間距、冇底留位，
 * 真瀏覽器會將 scrollTop 截到舊 scrollHeight − clientHeight，focus 會跳（W-465）。
 * 第一次量當之前唔使捲（scrollTop 係 0）：focus 0 嘅 snap 位都係 0，唔會亂捲
 */
const useSnapOnScrollStart = (
    shelfRef: RefObject<HTMLElement | null>,
    layout: ShelfLayout | undefined,
    focusRef: RefObject<number>,
) => {
    const wasScrollingRef = useRef(false);
    useLayoutEffect(() => {
        const scrolls = layout?.scrolls ?? false;
        const wasScrolling = wasScrollingRef.current;
        wasScrollingRef.current = scrolls;
        const shelf = shelfRef.current;
        if (shelf && layout && scrolls && !wasScrolling) {
            shelf.scrollTop = snapTop(focusRef.current, layout);
        }
    }, [shelfRef, layout, focusRef]);
};

/**
 * 捲動之後邊張係 focus；唔使捲、未量到，或者唔係用家捲就冇（唔改 focus）。
 * 書架尺寸變咗但新 layout 未 commit（CUI-0002）：呢下 scroll 係瀏覽器按舊 layout 截短 scrollTop，
 * 照舊 layout 計會跳去前一張；等 RO 量完（唔使捲就捲返頂）、新 layout commit 先再跟 scroll
 */
const scrollFocus = (
    shelf: HTMLElement | null,
    count: number,
    layout: ShelfLayout | undefined,
): number | undefined => {
    if (!shelf || !layout?.scrolls) return undefined;
    if (!sameShelfLayout(measure(shelf, count), layout)) return undefined;
    return focusIndexAt(shelf.scrollTop, count, layout);
};

/** 書架 inline style：卡高、卡距（CSS 用）同要捲先有嘅底留位 */
const shelfStyle = (layout?: ShelfLayout): CSSProperties | undefined =>
    layout &&
    ({
        '--drama-shelf-step': `${layout.stepPx}px`,
        '--drama-shelf-card': `${layout.cardPx}px`,
        paddingBottom: layout.tailPx,
    } as CSSProperties);

/** 每張卡嘅 props：撳 / 鍵盤 focus / click 點樣分 open 定捲做 focus */
const useTileProps = (focus: number, focusTile: (index: number) => void) => {
    // 撳落去嗰刻邊張係 focus（pointerdown → focus → click，click 時 focus 可能已經變咗）
    const pressRef = useRef<number | null>(null);
    return (index: number, onOpen: () => void) => ({
        'data-focused': index === focus ? '' : undefined,
        onPointerDown: () => (pressRef.current = focus),
        // 撳落去之後變咗捲動（冇 click）：唔好留住，否則之後鍵盤 focus 會當係撳
        onPointerCancel: () => (pressRef.current = null),
        // 鍵盤 Tab 過嚟先捲；撳落去引起嘅 focus 由 click 處理
        onFocus: () => pressRef.current === null && focusTile(index),
        onClick: (event: MouseEvent) => {
            const focusAtPress = pressRef.current ?? focus;
            pressRef.current = null;
            const keyboard = event.detail === 0;
            if (tapAction({ index, focusAtPress, keyboard }) === 'open') onOpen();
            else focusTile(index);
        },
    });
};

/**
 * 直版疊卡書架嘅 focus（「捲相簿」）：要捲（放唔晒）就停喺 snap 位嗰張係 focus；唔使捲就撳邊張邊張係 focus。
 * 撳暗咗嘅卡 → 佢做 focus（要捲就捲過去）；撳 focus 卡 / 鍵盤 Enter / 讀屏 → open。
 * 鍵盤 Tab 到一張卡就佢做 focus。enabled = false（橫版）就照舊撳落即 open
 */
export const useShelfFocus = (count: number, enabled: boolean) => {
    const shelfRef = useRef<HTMLElement>(null);
    const [focus, setFocus] = useState(0);
    // 畀變要捲嗰刻讀最新 focus（W-464）：唔放入 effect deps，focus 變唔會重捲；
    // 喺 effect 更新，唔喺 render 寫 ref
    const focusRef = useRef(focus);
    useLayoutEffect(() => {
        focusRef.current = focus;
    }, [focus]);
    const layout = useShelfLayout(shelfRef, count, enabled);
    useSnapOnScrollStart(shelfRef, layout, focusRef);
    const scrolls = layout?.scrolls ?? false;

    const focusTile = (index: number) => {
        const shelf = shelfRef.current;
        if (scrolls && layout) {
            shelf?.scrollTo({ top: snapTop(index, layout), behavior: scrollBehavior() });
        }
        setFocus(index);
    };
    const onScroll = () => {
        const index = scrollFocus(shelfRef.current, count, layout);
        if (index !== undefined) setFocus(index);
    };
    const tileProps = useTileProps(focus, focusTile);
    return { shelfRef, style: shelfStyle(layout), scrolls, onScroll, tileProps, enabled };
};
