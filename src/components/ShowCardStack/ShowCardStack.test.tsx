import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SHOW_THEMES } from '../../config/showThemes';
import { ArcSlider } from '../ArcSlider/ArcSlider';
import { PageDots } from '../PageDots/PageDots';
import { CARD_FLY_MS, CARD_SPRING_MS } from './cardStack';
import { ShowCardStack, type StackCard } from './ShowCardStack';

const CARDS: StackCard[] = [
    { key: 'a', title: '甲節目', theme: SHOW_THEMES.sunnyday },
    { key: 'b', title: '乙節目', theme: SHOW_THEMES.badgirl },
    { key: 'c', title: '丙節目', theme: SHOW_THEMES.wanni },
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
        const { group, onChange } = setup(
            1,
            CARDS,
            <ArcSlider
                value={0}
                max={600}
                onSeek={onSeek}
                label="播放進度"
                formatValueText={String}
            />,
        );

        drag(screen.getByRole('slider', { name: '播放進度' }), -150);
        finishFly();

        expect(onSeek).toHaveBeenCalled();
        expect(cardDx(group)).toBe('');
        expect(onChange).not.toHaveBeenCalled();
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

    it('should ignore arrow keys meant for inner buttons, but react on the dots', () => {
        const { onChange } = setup(
            1,
            CARDS,
            <>
                <button type="button">內容</button>
                <PageDots
                    keys={['a', 'b', 'c']}
                    labels={['甲', '乙', '丙']}
                    index={1}
                    onSelect={vi.fn()}
                />
            </>,
        );

        fireEvent.keyDown(screen.getByRole('button', { name: '內容' }), { key: 'ArrowRight' });
        finishFly();
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.keyDown(screen.getByRole('button', { name: '乙' }), { key: 'ArrowRight' });
        finishFly();
        expect(onChange).toHaveBeenCalledWith(2);
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
    afterEach(() => vi.useRealTimers());

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

    it('should swallow a dot tap made during the flight', () => {
        const onSelect = vi.fn();
        const { group, onChange } = setup(
            1,
            CARDS,
            <PageDots
                keys={['a', 'b', 'c']}
                labels={['甲', '乙', '丙']}
                index={1}
                onSelect={onSelect}
            />,
        );

        // 用方向鍵起飛：唔係拖動，拖完食 click 嗰個保護唔會幫手
        fireEvent.keyDown(group, { key: 'ArrowRight' });
        fireEvent.click(screen.getByRole('button', { name: '甲' }), { detail: 1 });
        finishFly();

        expect(onSelect).not.toHaveBeenCalled();
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
