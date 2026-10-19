import { useRef, type DragEvent, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { dragIntent, type SwipeDirection } from '../../hooks/swipe';
import { useClickSuppression } from '../../hooks/useSwipe';
import { pushSample, releaseDirection, velocityOf, type DragSample } from './cardStack';
import type { CardMotion } from './useCardMotion';

interface Gesture {
    pointerId: number;
    x: number;
    y: number;
    /** 已經確認係橫拖（之前只係按住，未知橫定直） */
    isDragging: boolean;
    samples: DragSample[];
    /** 按低時嘅 flightId：之後飛過（例如方向鍵）就唔再係同一個手勢 */
    flight: number;
}

type GestureRef = RefObject<Gesture | null>;
type StackPointerEvent = PointerEvent<HTMLElement>;

const sampleOf = (event: StackPointerEvent): DragSample => ({
    x: event.clientX,
    t: event.timeStamp,
});

/** 未確認橫拖就睇吓方向：直向放棄（交返畀瀏覽器捲頁），橫向就開始拖 */
const confirmHorizontal = (gesture: GestureRef, current: Gesture, event: StackPointerEvent) => {
    const intent = dragIntent(event.clientX - current.x, event.clientY - current.y);
    if (intent === 'vertical') gesture.current = null;
    if (intent !== 'horizontal') return false;
    current.isDragging = true;
    // 放手（pointerup）嗰下唔可以再 capture
    if (event.type === 'pointermove') event.currentTarget.setPointerCapture?.(event.pointerId);
    return true;
};

/** 跟住指標更新；返回橫向拖咗幾多 px，未確認橫拖就係 null */
const track = (gesture: GestureRef, event: StackPointerEvent, motion: CardMotion) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return null;
    // 拖緊時方向鍵令張卡飛走咗（飛緊或者已經落地）：鍵盤要求優先，呢個手勢就作廢
    // （放手唔再彈返 / 轉節目）；就算飛行期間冇 pointer event 都認得出
    if (motion.isFlying() || current.flight !== motion.flightId()) {
        gesture.current = null;
        return null;
    }
    if (!current.isDragging && !confirmHorizontal(gesture, current, event)) return null;
    const dx = event.clientX - current.x;
    current.samples = pushSample(current.samples, sampleOf(event));
    motion.drag(dx);
    return dx;
};

/** 放手：拖得夠遠 / 甩得夠快就交畀 onSwipe（飛走），否則彈返；返回有冇拖過 */
const release = (
    gesture: GestureRef,
    event: StackPointerEvent,
    motion: CardMotion,
    commit: ((direction: SwipeDirection) => void) | null,
): boolean => {
    const dx = track(gesture, event, motion);
    const samples = gesture.current?.samples ?? [];
    gesture.current = null;
    if (dx === null) return false;
    const direction = commit && releaseDirection(dx, velocityOf(samples), motion.width());
    if (direction) commit(direction);
    else motion.springBack();
    return true;
};

/** 按低：飛緊或者第二隻手指就唔理；彈緊返中間就由張卡而家嘅位置接住，當已經係橫拖 */
const begin = (gesture: GestureRef, event: StackPointerEvent, motion: CardMotion) => {
    if (motion.isFlying() || gesture.current) return;
    const held = motion.grab();
    const { pointerId, clientX, clientY: y } = event;
    const x = clientX - (held ?? 0);
    const isDragging = held !== null;
    // 接住彈緊嘅卡即刻算橫拖，confirmHorizontal 唔會行，要喺度 capture，否則喺外面放手會卡住
    if (isDragging) event.currentTarget.setPointerCapture?.(pointerId);
    const samples = [sampleOf(event)];
    gesture.current = { pointerId, x, y, isDragging, samples, flight: motion.flightId() };
};

/** 取消 / 冇咗 capture（例如喺視窗外放手）：拖緊就彈返，手勢作廢 */
const abandon = (gesture: GestureRef, motion: CardMotion, pointerId?: number) => {
    const current = gesture.current;
    if (!current || (pointerId !== undefined && current.pointerId !== pointerId)) return;
    if (current.isDragging) motion.springBack();
    gesture.current = null;
};

/**
 * 飛緊嗰張卡（連指示點）唔再收 click：否則會播 / 停飛走緊嗰個節目，
 * 或者撳嘅指示點畀落地嘅轉節目蓋過。鍵盤 click 都一樣擋（CSS pointer-events 擋唔到）
 */
const swallow = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
};

/**
 * 跟手指拖卡（配合 touch-action: pan-y）。commit 係 null（例如得一個節目）就永遠彈返。
 * ArcSlider 自己 stopPropagation，所以拖弧形唔會郁張卡；拖完嘅 click 會被食咗。
 */
export const useCardDrag = (
    motion: CardMotion,
    commit: ((direction: SwipeDirection) => void) | null,
) => {
    const gesture = useRef<Gesture | null>(null);
    const clicks = useClickSuppression();
    return {
        onPointerDown: (event: StackPointerEvent) => {
            clicks.arm(false);
            begin(gesture, event, motion);
        },
        onPointerMove: (event: StackPointerEvent) => void track(gesture, event, motion),
        onPointerUp: (event: StackPointerEvent) =>
            clicks.arm(release(gesture, event, motion, commit)),
        onPointerCancel: () => abandon(gesture, motion),
        onLostPointerCapture: (event: StackPointerEvent) =>
            abandon(gesture, motion, event.pointerId),
        onClickCapture: (event: MouseEvent<HTMLElement>) => {
            if (motion.isFlying()) swallow(event);
            else clicks.onClickCapture(event);
        },
        // 滑鼠拖節目圖會觸發原生拖放（之後 pointercancel），要擋住
        onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    };
};
