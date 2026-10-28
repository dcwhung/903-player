import {
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent,
    type PointerEvent,
    type RefObject,
} from 'react';
import { useClickSuppression } from '../../hooks/useSwipe';
import { cssPx } from '../../utils/cssLength';
import { scrollBehavior } from '../../utils/motion';
import {
    cardIndexAtY,
    focusIndexAt,
    sameShelfLayout,
    snapTop,
    tailPadding,
    tapAction,
    type ShelfMetrics,
} from './shelfFocus';
import { stackLayout, type StackLayout } from './shelfStack';

/** 書架嘅 token（tokens.css）：卡距、focus 卡上面露幾多、卡最矮 / 最高比例、疊卡間距最細、捽幾遠先當捽 */
const TOKEN = {
    gap: '--home-tile-gap',
    peek: '--drama-shelf-peek',
    minRatio: '--drama-shelf-min-ratio',
    maxRatio: '--drama-shelf-max-ratio',
    minStep: '--drama-shelf-min-step',
    scrubSlop: '--drama-shelf-scrub-slop',
} as const;

const px = (value: string): number => parseFloat(value) || 0;

interface ShelfLayout extends StackLayout, ShelfMetrics {
    /** 要捲先有：底留位，最尾一張都捲得到 snap 位 */
    tailPx?: number;
    /** 手指上下郁過幾多先當捽（之前仍然係撳） */
    scrubSlopPx: number;
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
    const metrics = {
        ...stack,
        topPx,
        peekPx: cssPx(token(TOKEN.peek)),
        scrubSlopPx: cssPx(token(TOKEN.scrubSlop)),
    };
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

/**
 * 每張卡入面每粒掣嘅 props：撳 / 鍵盤 focus / click 點樣分 open 定捲做 focus
 * （一張卡有幾粒掣就每粒各自攞，onOpen 係嗰粒掣自己做嘅嘢）。
 * pressRef：撳落去嗰刻邊張係 focus（pointerdown → focus → click，click 時 focus 可能已經變咗）
 */
const useTileProps =
    (focus: number, focusTile: (index: number) => void, pressRef: RefObject<number | null>) =>
    (index: number, onOpen: () => void) => ({
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

interface ScrubSession {
    /** 邊隻手指 / pen 開始嘅；其他 pointer 嘅 events 唔理 */
    pointerId: number;
    startY: number;
    scrubbing: boolean;
}

type ShelfPointer = PointerEvent<HTMLElement>;

/** 呢下 move 之後係咪捽緊：郁過 slop 先開始（之前仍然可以係撳），開始就 capture 埋，手指出咗書架都跟 */
const isScrubbing = (session: ScrubSession, event: ShelfPointer, slopPx: number): boolean => {
    if (session.scrubbing) return true;
    if (Math.abs(event.clientY - session.startY) < slopPx) return false;
    session.scrubbing = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    return true;
};

/** 手指喺書架入面嘅 y（由書架內容頂量起，同 cardIndexAtY 嘅卡頂一樣） */
const shelfY = (event: ShelfPointer): number => {
    const shelf = event.currentTarget;
    return event.clientY - shelf.getBoundingClientRect().top + shelf.scrollTop;
};

/** 撳落去：唔使捲先開始一下捽（未當捽住，等 isScrubbing）；要捲 / 未量到 / 唔係主掣就冇 */
const scrubStart = (layout: ShelfLayout | undefined, event: ShelfPointer): ScrubSession | null =>
    !layout || layout.scrolls || event.button !== 0
        ? null
        : { pointerId: event.pointerId, startY: event.clientY, scrubbing: false };

interface ScrubOptions {
    layout: ShelfLayout | undefined;
    count: number;
    setFocus: (index: number) => void;
    /** 同 useTileProps 共用：捽完要清，唔好當之後嘅鍵盤 focus 係撳 */
    pressRef: RefObject<number | null>;
}

/**
 * 唔使捲嘅疊卡書架：手指 / pen（滑鼠撳住都得）上下捽，focus 即刻跟手指下面嗰張卡（「捲相簿」）。
 * 放手 focus 留喺嗰張、唔 open，跟住嗰下 click 食咗（useClickSuppression，鍵盤 click 唔食）；
 * 冇郁過 slop 就係普通撳（useTileProps）。要捲（或者未量到 / 橫版）就冇：交返原生捲動 + snap
 */
const useShelfScrub = ({ layout, count, setFocus, pressRef }: ScrubOptions) => {
    const sessionRef = useRef<ScrubSession | null>(null);
    const { arm, onClickCapture } = useClickSuppression();
    const session = (event: ShelfPointer) =>
        sessionRef.current?.pointerId === event.pointerId ? sessionRef.current : null;
    const finish = (event: ShelfPointer) => {
        const ended = session(event);
        if (!ended) return;
        sessionRef.current = null;
        arm(ended.scrubbing);
        // 捽完冇 click 去清：唔好留住，否則之後鍵盤 focus 會當係撳
        if (ended.scrubbing) pressRef.current = null;
    };
    const onPointerMove = (event: ShelfPointer) => {
        const moving = session(event);
        if (!layout || !moving || !isScrubbing(moving, event, layout.scrubSlopPx)) return;
        setFocus(cardIndexAtY(shelfY(event), count, layout));
    };
    const onPointerDown = (event: ShelfPointer) => {
        arm(false);
        sessionRef.current = scrubStart(layout, event);
    };
    return {
        onPointerDown,
        onPointerMove,
        onPointerUp: finish,
        onPointerCancel: finish,
        onClickCapture,
    };
};

/**
 * 直版疊卡書架嘅 focus（「捲相簿」）：要捲（放唔晒）就停喺 snap 位嗰張係 focus；
 * 唔使捲就撳邊張邊張係 focus，或者手指上下捽，focus 跟手指（useShelfScrub）。
 * 撳暗咗嘅卡 → 佢做 focus（要捲就捲過去）；撳 focus 卡 / 鍵盤 Enter / 讀屏 → open。
 * 鍵盤 Tab 到一張卡就佢做 focus。enabled = false（橫版）就照舊撳落即 open
 */
export const useShelfFocus = (count: number, enabled: boolean) => {
    const shelfRef = useRef<HTMLElement>(null);
    const [focus, setFocus] = useState(0);
    // 畀變要捲嗰刻讀最新 focus（W-464）：唔放入 effect deps，focus 變唔會重捲；
    // 喺 effect 更新，唔喺 render 寫 ref
    const focusRef = useRef(focus);
    const pressRef = useRef<number | null>(null);
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
    const tileProps = useTileProps(focus, focusTile, pressRef);
    const scrubProps = useShelfScrub({ layout, count, setFocus, pressRef });
    return { shelfRef, style: shelfStyle(layout), scrolls, onScroll, focus, tileProps, scrubProps };
};
