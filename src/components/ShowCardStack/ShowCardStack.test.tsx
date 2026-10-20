import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SHOW_THEMES } from '../../config/showThemes';
import { ArcSlider } from '../ArcSlider/ArcSlider';
import { CARD_FLY_MS, CARD_SPRING_MS } from './cardStack';
import { ShowCardStack, type StackCard } from './ShowCardStack';

const CARDS: StackCard[] = [
    { title: '甲節目', theme: SHOW_THEMES.sunnyday },
    { title: '乙節目', theme: SHOW_THEMES.badgirl },
    { title: '丙節目', theme: SHOW_THEMES.wanni },
];
const LABEL = '今日節目，左右掃動轉節目';

const setup = (index = 1, cards = CARDS, children?: ReactNode) => {
    const onChange = vi.fn();
    const onInnerClick = vi.fn();
    render(
        <ShowCardStack cards={cards} index={index} onChange={onChange}>
            {children ?? (
                <button type="button" onClick={onInnerClick}>
                    內容
                </button>
            )}
        </ShowCardStack>,
    );
    return { group: screen.getByRole('group', { name: LABEL }), onChange, onInnerClick };
};

/** 拖一下：按低、橫向郁（經過 dx/2 先到 dx）、放手 */
const drag = (target: Element, dx: number, dy = 0, pointerType = 'mouse') => {
    const start = { clientX: 200, clientY: 100, pointerType };
    fireEvent.pointerDown(target, start);
    fireEvent.pointerMove(target, { ...start, clientX: 200 + dx / 2, clientY: 100 + dy / 2 });
    fireEvent.pointerMove(target, { ...start, clientX: 200 + dx, clientY: 100 + dy });
    fireEvent.pointerUp(target, { ...start, clientX: 200 + dx, clientY: 100 + dy });
};

const ringSlider = (onSeek: (seconds: number) => void) => (
    <ArcSlider value={0} max={600} onSeek={onSeek} label="播放進度" formatValueText={String} />
);

/** 將弧形擺喺畫面 (left, top)，300px 大（同 viewBox 一樣） */
const ringAt = (left: number, top: number) => {
    const slider = screen.getByRole('slider', { name: '播放進度' });
    slider.getBoundingClientRect = () => ({ left, top, width: 300, height: 300 }) as DOMRect;
    return slider;
};

const finishFly = () => act(() => vi.advanceTimersByTime(CARD_FLY_MS));
const cardDx = (group: HTMLElement) => group.style.getPropertyValue('--card-dx');

describe('ShowCardStack', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should move the card with the finger and tilt it while dragging', () => {
        const { group } = setup();

        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(group, { clientX: 100, clientY: 104 });

        expect(cardDx(group)).toBe('-100px');
        expect(group.style.getPropertyValue('--card-rotate')).toBe('-5deg');
        expect(group).toHaveAttribute('data-phase', 'dragging');
    });

    it('should go to the next show after the card flies out on a left swipe', () => {
        const { group, onChange } = setup();

        drag(group, -150);
        expect(group).toHaveAttribute('data-phase', 'fly-next');
        expect(onChange).not.toHaveBeenCalled();
        finishFly();

        expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
        expect(group).not.toHaveAttribute('data-phase');
        expect(cardDx(group)).toBe('');
    });

    it('should go to the previous show on a right swipe', () => {
        const { group, onChange } = setup();

        drag(group, 150);
        expect(group).toHaveAttribute('data-phase', 'fly-previous');
        finishFly();

        expect(onChange).toHaveBeenCalledExactlyOnceWith(0);
    });

    it('should wrap around at both ends', () => {
        const last = setup(2);
        drag(last.group, -150);
        finishFly();
        expect(last.onChange).toHaveBeenCalledWith(0);

        cleanup();
        const first = setup(0);
        drag(first.group, 150);
        finishFly();
        expect(first.onChange).toHaveBeenCalledWith(2);
    });

    it('should spring back when the drag is too short', () => {
        const { group, onChange } = setup();

        drag(group, -30);
        expect(group).toHaveAttribute('data-phase', 'settling');
        expect(cardDx(group)).toBe('');
        act(() => vi.advanceTimersByTime(CARD_SPRING_MS));

        expect(group).not.toHaveAttribute('data-phase');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should never commit with a single show', () => {
        const { group, onChange } = setup(0, CARDS.slice(0, 1));

        drag(group, -250);
        fireEvent.keyDown(group, { key: 'ArrowRight' });
        finishFly();

        expect(group).not.toHaveAttribute('data-phase', 'fly-next');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should leave vertical drags to page scrolling', () => {
        const { group, onChange } = setup();

        drag(group, -20, 200);
        finishFly();

        expect(cardDx(group)).toBe('');
        expect(group).not.toHaveAttribute('data-phase');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should not move the card while the arc slider is dragged', () => {
        const onSeek = vi.fn();
        const { group, onChange } = setup(1, CARDS, ringSlider(onSeek));

        // drag 由 (200, 100) 起手：擺喺弧形頂部（viewBox 150, 10），即係撳中圓環
        drag(ringAt(50, 90), -150);
        finishFly();

        expect(onSeek).toHaveBeenCalled();
        expect(cardDx(group)).toBe('');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should swipe the card when the drag starts in a corner of the progress ring box', () => {
        const { onChange } = setup(1, CARDS, ringSlider(vi.fn()));

        // (200, 100) 係 viewBox (5, 5)：唱片格左上角，圓環以外
        drag(ringAt(195, 95), -150);
        finishFly();

        expect(onChange).toHaveBeenCalledWith(2);
    });

    it('should swallow the click that follows a drag over an inner button', () => {
        const { onInnerClick } = setup();
        const inner = screen.getByRole('button', { name: '內容' });

        drag(inner, -30);
        fireEvent.click(inner, { detail: 1 });
        drag(inner, -150);
        fireEvent.click(inner, { detail: 1 });

        expect(onInnerClick).not.toHaveBeenCalled();
    });

    it('should let plain and keyboard clicks through', () => {
        const { onInnerClick } = setup();
        const inner = screen.getByRole('button', { name: '內容' });

        fireEvent.pointerDown(inner, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 102, clientY: 100 });
        fireEvent.click(inner, { detail: 1 });
        drag(inner, -150, 0, 'touch');
        finishFly();
        fireEvent.click(inner, { detail: 0 });

        expect(onInnerClick).toHaveBeenCalledTimes(2);
    });

    it('should pick the card up where it is when grabbed while springing back', () => {
        const { group, onChange } = setup();
        const top = screen.getByRole('button', { name: '內容' }).parentElement;

        drag(group, -40);
        expect(group).toHaveAttribute('data-phase', 'settling');
        // 彈返途中：瀏覽器 computed transform 停喺 -25px
        top?.style.setProperty('transform', 'matrix(1, 0, 0, 1, -25, 0)');
        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        expect(group).toHaveAttribute('data-phase', 'dragging');
        expect(cardDx(group)).toBe('-25px');
        fireEvent.pointerMove(group, { clientX: 195, clientY: 100 });
        act(() => vi.advanceTimersByTime(CARD_SPRING_MS));

        expect(cardDx(group)).toBe('-30px');
        expect(group).toHaveAttribute('data-phase', 'dragging');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should capture the pointer when grabbed mid spring-back, and let go on lost capture', () => {
        const { group } = setup();
        const top = screen.getByRole('button', { name: '內容' }).parentElement;
        const capture = vi.fn();
        group.setPointerCapture = capture;

        drag(group, -40);
        top?.style.setProperty('transform', 'matrix(1, 0, 0, 1, -25, 0)');
        fireEvent.pointerDown(group, { pointerId: 3, clientX: 200, clientY: 100 });
        expect(capture).toHaveBeenCalledWith(3);

        // 例如喺視窗外放手：冇 pointerup，只有 lostpointercapture
        fireEvent.lostPointerCapture(group, { pointerId: 3 });
        expect(group).toHaveAttribute('data-phase', 'settling');
        fireEvent.pointerMove(group, { pointerId: 3, clientX: 150, clientY: 100 });
        expect(cardDx(group)).toBe('');

        // 之後再按低可以照拖
        top?.style.removeProperty('transform');
        act(() => vi.advanceTimersByTime(CARD_SPRING_MS));
        fireEvent.pointerDown(group, { pointerId: 4, clientX: 200, clientY: 100 });
        fireEvent.pointerMove(group, { pointerId: 4, clientX: 170, clientY: 100 });
        expect(cardDx(group)).toBe('-30px');
    });

    it('should keep dragging when the touch target loses its implicit capture to the stack', () => {
        // 觸控有隱式 capture（落喺手指下面嗰個子元素）；卡疊 setPointerCapture 搶過嚟時，
        // 子元素嘅 lostpointercapture 會冒泡上嚟，唔可以當係放手（iOS / Android 實機拖唔到嘅原因）
        const { group, onChange } = setup();
        const inner = screen.getByRole('button', { name: '內容' });
        const start = { pointerId: 7, pointerType: 'touch', clientY: 100 };

        fireEvent.pointerDown(inner, { ...start, clientX: 200 });
        fireEvent.pointerMove(inner, { ...start, clientX: 180, clientY: 104 });
        fireEvent.lostPointerCapture(inner, { pointerId: 7 });
        fireEvent.pointerMove(group, { ...start, clientX: 60, clientY: 110 });
        expect(cardDx(group)).toBe('-140px');
        expect(group).toHaveAttribute('data-phase', 'dragging');

        fireEvent.pointerUp(group, { ...start, clientX: 40, clientY: 112 });
        finishFly();
        expect(onChange).toHaveBeenCalledWith(2);
    });

    it('should treat a tap near the centre during spring-back as a tap, not a drag', () => {
        const { group, onInnerClick } = setup();
        const inner = screen.getByRole('button', { name: '內容' });

        drag(group, -40);
        // 差唔多彈返中間（未過橫拖門檻）先撳
        inner.parentElement?.style.setProperty('transform', 'matrix(1, 0, 0, 1, -5, 0)');
        fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 200, clientY: 100 });
        fireEvent.click(inner, { detail: 1 });

        expect(onInnerClick).toHaveBeenCalledTimes(1);
        expect(group).toHaveAttribute('data-phase', 'settling');
    });

    it('should carry on from the card offset when a near-centre tap during spring-back becomes a drag', () => {
        const { group } = setup();
        const top = screen.getByRole('button', { name: '內容' }).parentElement;

        drag(group, -40);
        top?.style.setProperty('transform', 'matrix(1, 0, 0, 1, -5, 0)');
        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        expect(group).toHaveAttribute('data-phase', 'settling');
        fireEvent.pointerMove(group, { clientX: 185, clientY: 100 });

        // 手指郁咗 -15px，張卡由佢而家 -5px 嘅位置接落去
        expect(cardDx(group)).toBe('-20px');
    });

    it('should spring back when the pointer is cancelled', () => {
        const { group, onChange } = setup();

        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(group, { clientX: 20, clientY: 100 });
        fireEvent.pointerCancel(group);
        finishFly();

        expect(cardDx(group)).toBe('');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should fly the card out on the arrow keys', () => {
        const { group, onChange } = setup();

        fireEvent.keyDown(group, { key: 'ArrowRight' });
        expect(group).toHaveAttribute('data-phase', 'fly-next');
        finishFly();
        fireEvent.keyDown(group, { key: 'ArrowLeft' });
        finishFly();

        expect(onChange).toHaveBeenNthCalledWith(1, 2);
        expect(onChange).toHaveBeenNthCalledWith(2, 0);
    });

    it('should ignore arrow keys meant for inner buttons', () => {
        const { onChange } = setup();

        fireEvent.keyDown(screen.getByRole('button', { name: '內容' }), { key: 'ArrowRight' });
        finishFly();

        expect(onChange).not.toHaveBeenCalled();
    });

    it('should swap instantly when the user prefers reduced motion', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => ({ matches: query.includes('reduce'), media: query })),
        );
        const { group, onChange } = setup();

        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(group, { clientX: 100, clientY: 100 });
        expect(group.style.getPropertyValue('--card-rotate')).toBe('0deg');
        fireEvent.pointerUp(group, { clientX: 20, clientY: 100 });

        expect(onChange).toHaveBeenCalledWith(2);
        expect(group).not.toHaveAttribute('data-phase');
    });

    it('should be focusable itself', () => {
        const { group } = setup();

        expect(group).toHaveAttribute('tabindex', '0');
    });

    it('should stack the next shows behind as hidden, inert cards with only art and title', () => {
        const { group } = setup(0);

        const backs = [...group.querySelectorAll('[aria-hidden="true"][inert]')];
        expect(backs.map((card) => card.textContent)).toEqual(['丙節目', '乙節目', '丙節目']);
        backs.forEach((card) => {
            expect(card.querySelector('img')).toHaveAttribute('src', expect.any(String));
            expect(card.querySelector('button, audio, [role="slider"]')).toBeNull();
        });
        expect(screen.getByRole('button', { name: '內容' }).closest('[inert]')).toBeNull();
    });

    it('should render no back cards with a single show', () => {
        const { group } = setup(0, CARDS.slice(0, 1));

        expect(group.querySelector('[inert]')).toBeNull();
    });
});

describe('ShowCardStack during the fly-out', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should ignore a second drag made during the flight', () => {
        const { group, onChange } = setup();

        drag(group, -150);
        drag(group, 150);
        expect(group).toHaveAttribute('data-phase', 'fly-next');
        finishFly();
        finishFly();

        expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
    });

    it('should ignore an arrow key pressed during the flight', () => {
        const { group, onChange } = setup();

        fireEvent.keyDown(group, { key: 'ArrowRight' });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });
        finishFly();
        finishFly();

        expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
    });

    it('should swallow a play tap, by pointer or keyboard, made during the flight', () => {
        const { group, onInnerClick } = setup();
        const inner = screen.getByRole('button', { name: '內容' });

        fireEvent.keyDown(group, { key: 'ArrowRight' });
        fireEvent.click(inner, { detail: 1 });
        fireEvent.click(inner, { detail: 0 });
        finishFly();
        fireEvent.click(inner, { detail: 0 });

        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('should let an arrow key pressed mid-drag take over and land, without jamming clicks', () => {
        const { group, onChange, onInnerClick } = setup();

        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(group, { clientX: 180, clientY: 100 });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });
        fireEvent.pointerMove(group, { clientX: 150, clientY: 100 });
        fireEvent.pointerUp(group, { clientX: 150, clientY: 100 });
        // 瀏覽器喺放手之後即刻發嘅 click（仲飛緊）：食咗，而且唔會留低標記食埋落地後嘅 click
        fireEvent.click(screen.getByRole('button', { name: '內容' }), { detail: 1 });
        finishFly();

        expect(group).not.toHaveAttribute('data-phase');
        expect(onChange).toHaveBeenCalledExactlyOnceWith(0);
        fireEvent.click(screen.getByRole('button', { name: '內容' }), { detail: 1 });
        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('should drop a drag that a keyboard flight interrupted, even with no pointer event mid-flight', () => {
        const { group, onChange } = setup();

        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(group, { clientX: 50, clientY: 100 });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });
        finishFly();
        fireEvent.pointerUp(group, { clientX: 50, clientY: 100 });
        finishFly();

        expect(onChange).toHaveBeenCalledExactlyOnceWith(0);
        expect(group).not.toHaveAttribute('data-phase');
    });

    it('should drop a drag that an instant reduced-motion swap interrupted', () => {
        // 減少動畫：方向鍵即刻換、從來唔會 isFlying，淨係靠 flightId 認出手勢已經作廢
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => ({ matches: query.includes('reduce'), media: query })),
        );
        const { group, onChange } = setup();

        fireEvent.pointerDown(group, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(group, { clientX: 50, clientY: 100 });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });
        fireEvent.pointerUp(group, { clientX: 50, clientY: 100 });
        act(() => vi.advanceTimersByTime(CARD_SPRING_MS));

        expect(onChange).toHaveBeenCalledExactlyOnceWith(0);
        expect(group).not.toHaveAttribute('data-phase');
    });

    it('should still swallow the click of a drag that a flight dropped, once it has landed', () => {
        const { group, onInnerClick } = setup();
        const inner = screen.getByRole('button', { name: '內容' });

        fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(inner, { clientX: 50, clientY: 100 });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });
        finishFly();
        fireEvent.pointerUp(inner, { clientX: 50, clientY: 100 });
        // 放手之後瀏覽器照發嘅 click 要食咗；下一下普通 tap 照常
        fireEvent.click(inner, { detail: 1 });
        expect(onInnerClick).not.toHaveBeenCalled();
        fireEvent.click(inner, { detail: 1 });
        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('should still swallow the click of a dropped drag when the finger moved after landing', () => {
        const { group, onChange, onInnerClick } = setup();
        const inner = screen.getByRole('button', { name: '內容' });

        fireEvent.pointerDown(inner, { clientX: 200, clientY: 100 });
        fireEvent.pointerMove(inner, { clientX: 50, clientY: 100 });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });
        finishFly();
        // 落地之後手指仲郁咗先放手：手勢已經作廢，唔可以再拖或者轉節目，但放手嗰下 click 照食
        fireEvent.pointerMove(inner, { clientX: 20, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 20, clientY: 100 });
        fireEvent.click(inner, { detail: 1 });

        expect(onInnerClick).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledExactlyOnceWith(0);
        expect(group).not.toHaveAttribute('data-phase');
        fireEvent.click(inner, { detail: 1 });
        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('should not override a show picked elsewhere during the flight', () => {
        const onChange = vi.fn();
        const stack = (index: number) => (
            <ShowCardStack cards={CARDS} index={index} onChange={onChange}>
                <span>內容</span>
            </ShowCardStack>
        );
        const { rerender } = render(stack(1));

        drag(screen.getByRole('group', { name: LABEL }), -150);
        rerender(stack(0)); // 例如飛緊時撳咗下面清單嘅節目
        finishFly();

        expect(onChange).not.toHaveBeenCalled();
    });
});
