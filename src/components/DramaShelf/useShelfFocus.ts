import { useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { scrollBehavior } from '../../utils/motion';
import { focusIndexAt, snapTop, tailPadding, tapAction, type ShelfMetrics } from './shelfFocus';

const px = (value: string): number => parseFloat(value) || 0;

/** 由書架嘅 CSS 量：一行高（grid-auto-rows）、頂留白、snap 位上面留幾多（scroll-padding-top） */
const measure = (shelf: HTMLElement): ShelfMetrics => {
    const style = getComputedStyle(shelf);
    return {
        stepPx: px(style.gridAutoRows),
        topPx: px(style.paddingTop),
        peekPx: px(style.scrollPaddingTop),
    };
};

/** 底留位跟書架高度（轉向、iOS 工具列）；冇 ResizeObserver（jsdom）就量一次 */
const useTailPadding = (shelfRef: RefObject<HTMLElement | null>, enabled: boolean) => {
    const [padPx, setPadPx] = useState<number>();
    useLayoutEffect(() => {
        const shelf = shelfRef.current;
        if (!enabled || !shelf) return;
        const update = () => setPadPx(tailPadding(shelf.clientHeight, measure(shelf)));
        update();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
        observer?.observe(shelf);
        return () => observer?.disconnect();
    }, [shelfRef, enabled]);
    return enabled ? padPx : undefined;
};

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
 * 直版疊卡書架嘅 focus（「捲相簿」）：停喺 snap 位嗰張係 focus。
 * 撳暗咗嘅卡 → 捲佢做 focus；撳 focus 卡 / 鍵盤 Enter / 讀屏 → open。
 * 鍵盤 Tab 到一張卡就捲佢做 focus。enabled = false（橫版）就照舊撳落即 open
 */
export const useShelfFocus = (count: number, enabled: boolean) => {
    const shelfRef = useRef<HTMLElement>(null);
    const [focus, setFocus] = useState(0);
    const padPx = useTailPadding(shelfRef, enabled);

    const focusTile = (index: number) => {
        const shelf = shelfRef.current;
        shelf?.scrollTo({ top: snapTop(index, measure(shelf)), behavior: scrollBehavior() });
        setFocus(index);
    };
    const onScroll = () => {
        const shelf = shelfRef.current;
        if (shelf) setFocus(focusIndexAt(shelf.scrollTop, count, measure(shelf)));
    };
    const tileProps = useTileProps(focus, focusTile);
    return { shelfRef, padPx, onScroll, tileProps, enabled };
};
