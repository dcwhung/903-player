/*
 * 自訂 tooltip：Design Origin: mockup: _mockups_/admin-style/index.html#d（深色圓角泡泡 + 箭咀；滑鼠唔變「?」）
 * 滑鼠 hover / 鍵盤 focus 顯示，Esc / 離開收起。泡泡 portal 去 body（position: fixed），唔會被內容區
 * overflow 或者 nav 遮住；位置由 placeTooltip 計（冇位就翻去對面，喺視窗 / nav 右邊入面滑返入嚟）。
 * 讀屏：trigger 自己有 aria-label，泡泡 aria-hidden（唔重複讀）
 */
import {
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { placeTooltip, type Box, type TipPlacement, type TipSide } from './tooltipPlacement';

/** 內容區嘅 tooltip 唔好蓋過 nav：左邊界 = nav 右邊；nav 自己嘅 tooltip 用成個視窗 */
const boundsFor = (anchor: Element): Box => {
    const nav = anchor.closest('.nav') ? null : document.querySelector('.nav');
    const left = nav ? nav.getBoundingClientRect().right : 0;
    return { left, top: 0, right: window.innerWidth, bottom: window.innerHeight };
};

interface TooltipProps {
    text: string;
    side?: TipSide;
    /** false = 唔顯示（例如 nav 展開咗，字已經睇到） */
    enabled?: boolean;
    /** trigger（一個元素）；外面包一層 display: contents，唔影響 layout */
    children: ReactNode;
}

const usePlacement = (open: boolean, side: TipSide) => {
    const wrapRef = useRef<HTMLSpanElement | null>(null);
    const bubbleRef = useRef<HTMLSpanElement | null>(null);
    const [place, setPlace] = useState<TipPlacement | null>(null);
    useLayoutEffect(() => {
        const anchor = wrapRef.current?.firstElementChild;
        const bubble = bubbleRef.current;
        if (!open || !anchor || !bubble) return;
        const size = { width: bubble.offsetWidth, height: bubble.offsetHeight };
        setPlace(placeTooltip(anchor.getBoundingClientRect(), size, boundsFor(anchor), side));
        return () => setPlace(null);
    }, [open, side]);
    return { wrapRef, bubbleRef, place };
};

const bubbleStyle = (place: TipPlacement | null): CSSProperties =>
    place
        ? ({ left: place.x, top: place.y, '--arrow': `${place.arrow}px` } as CSSProperties)
        : { left: 0, top: 0, visibility: 'hidden' };

export function Tooltip({ text, side = 'top', enabled = true, children }: TooltipProps) {
    const [open, setOpen] = useState(false);
    const shown = open && enabled;
    const { wrapRef, bubbleRef, place } = usePlacement(shown, side);
    const hide = () => setOpen(false);
    return (
        <span
            ref={wrapRef}
            className="tip-anchor"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={hide}
            onFocus={() => setOpen(true)}
            onBlur={hide}
            onKeyDown={(event: KeyboardEvent) => event.key === 'Escape' && hide()}
        >
            {children}
            {shown &&
                createPortal(
                    <span
                        ref={bubbleRef}
                        className="tip-pop"
                        data-side={place?.side ?? side}
                        style={bubbleStyle(place)}
                        aria-hidden="true"
                    >
                        {text}
                    </span>,
                    document.body,
                )}
        </span>
    );
}
