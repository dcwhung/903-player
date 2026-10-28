import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { themeFor } from '../../shows';
import { MiniPlayer, type MiniPlayerProps } from './MiniPlayer';
import { ARMED_IDLE_MS, DISMISS_SLIDE_MS, LONG_PRESS_MS } from './miniPlayerDismiss';

const props = (overrides: Partial<MiniPlayerProps> = {}): MiniPlayerProps => ({
    showName: 'Bad Girl大過佬',
    region: '正在播放（今日節目）',
    openLabel: '開啟 Bad Girl大過佬 節目頁',
    theme: themeFor('badgirl'),
    subtitle: '19/10（一） · 12:40 / 1:58:30',
    timeText: '12:40 / 1:58:30',
    isPlaying: true,
    isAudible: true,
    upright: false,
    progress: 0.11,
    labels: ['雲妮鍾情', '在晴朗的一天出發', 'Bad Girl大過佬'],
    keys: ['/wanni.aac', '/sunnyday.aac', '/badgirl.aac'],
    index: 2,
    onToggle: vi.fn(),
    onOpen: vi.fn(),
    onChange: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
});

describe('MiniPlayer', () => {
    it('should keep the dots and their touch area above the row when there are several audios', () => {
        render(<MiniPlayer {...props()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region).toHaveAttribute('data-mode', 'multi');
        expect(region.querySelector('.dots')).not.toBeNull();
    });

    it('should drop the dots wrapper for a single audio (e.g. a drama episode)', () => {
        render(<MiniPlayer {...props({ labels: ['黃金少年'], keys: ['/ep1.aac'], index: 0 })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region).toHaveAttribute('data-mode', 'single');
        expect(region.querySelector('.dots')).toBeNull();
    });

    it('should spin the disc while it is audible', () => {
        render(<MiniPlayer {...props({ isPlaying: true, isAudible: true })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region.querySelector('.face')?.className).toMatch(/spinning/);
    });

    it('should stop the disc in place when paused', () => {
        render(<MiniPlayer {...props({ isPlaying: false, isAudible: false })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region.querySelector('.face')?.className).not.toMatch(/spinning/);
    });

    // CUI-0005：同大碟一樣，撳咗播但載緊 / 斷流（未出聲）唔轉
    it('should keep the disc still while loading or stalled, though play was pressed', () => {
        render(<MiniPlayer {...props({ isPlaying: true, isAudible: false })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region.querySelector('.face')?.className).not.toMatch(/spinning/);
        expect(screen.getByRole('button', { name: '暫停' })).toBeInTheDocument();
    });

    it('should stand the disc upright while the duration is unknown', () => {
        const { rerender } = render(<MiniPlayer {...props({ upright: true })} />);
        const face = () => screen.getByRole('region').querySelector('.face');
        expect(face()?.className).toMatch(/upright/);

        rerender(<MiniPlayer {...props({ upright: false })} />);
        expect(face()?.className).not.toMatch(/upright/);
    });

    it('names its region after what plays', () => {
        render(<MiniPlayer {...props({ region: '正在播放（廣播劇）' })} />);
        expect(screen.getByRole('region', { name: '正在播放（廣播劇）' })).toBeInTheDocument();
    });

    it('names the open button after where it leads', () => {
        render(<MiniPlayer {...props({ openLabel: '開啟 黃金少年 廣播劇頁' })} />);
        expect(screen.getByRole('button', { name: '開啟 黃金少年 廣播劇頁' })).toBeInTheDocument();
    });

    it('shows the current today show in its own theme', () => {
        render(<MiniPlayer {...props()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region).toHaveTextContent('Bad Girl大過佬');
        expect(region).toHaveTextContent('19/10（一） · 12:40 / 1:58:30');
        expect(region.closest('[data-theme-scope]')).toHaveStyle({ '--theme-accent': '#f08a24' });
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '11');
    });

    it('renders straight into the body, outside any page container that could clip it', () => {
        const { container } = render(<MiniPlayer {...props()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(container).not.toContainElement(region);
        expect(region.closest('[data-theme-scope]')?.parentElement).toBe(document.body);
    });

    it('names the progress bar and reads out the time', () => {
        render(<MiniPlayer {...props()} />);

        const bar = screen.getByRole('progressbar', { name: '播放進度' });
        expect(bar).toHaveAttribute('aria-valuetext', '12:40 / 1:58:30');
    });

    it('leaves out the value text while the duration is unknown', () => {
        render(<MiniPlayer {...props({ timeText: undefined })} />);

        expect(screen.getByRole('progressbar', { name: '播放進度' })).not.toHaveAttribute(
            'aria-valuetext',
        );
    });

    it('opens the show page and toggles playback', async () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        await userEvent.click(screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }));
        await userEvent.click(screen.getByRole('button', { name: '暫停' }));

        expect(p.onOpen).toHaveBeenCalledTimes(1);
        expect(p.onToggle).toHaveBeenCalledTimes(1);
    });

    it('switches to the previous today show on a right swipe', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 200, clientY: 12 });

        expect(p.onChange).toHaveBeenCalledWith(1);
    });

    it('wraps to the last today show when swiping right at the first show', () => {
        const p = props({ index: 0 });
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 200, clientY: 12 });

        expect(p.onChange).toHaveBeenCalledWith(2);
    });

    it('wraps to the first today show when swiping left at the last show', () => {
        const p = props({ index: 2 });
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 200, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 100, clientY: 12 });

        expect(p.onChange).toHaveBeenCalledWith(0);
    });

    it('does nothing when swiping with a single today show', () => {
        const p = props({ labels: ['Bad Girl大過佬'], keys: ['/badgirl.aac'], index: 0 });
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 200, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 100, clientY: 12 });
        fireEvent.pointerDown(region, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 200, clientY: 12 });

        expect(p.onChange).not.toHaveBeenCalled();
    });

    it('does not open the show page when a swipe ends on the open button', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

        fireEvent.pointerDown(open, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { clientX: 220, clientY: 10 });
        fireEvent.click(open, { detail: 1 }); // 滑鼠 click

        expect(p.onChange).toHaveBeenCalledWith(1);
        expect(p.onOpen).not.toHaveBeenCalled();
    });

    it('lets a keyboard click through after a touch swipe that sent no click', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });
        const toggle = screen.getByRole('button', { name: '暫停' });

        fireEvent.pointerDown(open, { pointerType: 'touch', clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { pointerType: 'touch', clientX: 220, clientY: 10 });
        fireEvent.click(toggle, { detail: 0 });
        fireEvent.click(open, { detail: 0 });

        expect(p.onChange).toHaveBeenCalledWith(1);
        expect(p.onToggle).toHaveBeenCalledTimes(1);
        expect(p.onOpen).toHaveBeenCalledTimes(1);
    });

    it('still opens the show page on a plain tap', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

        fireEvent.pointerDown(open, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { clientX: 102, clientY: 10 });
        fireEvent.click(open, { detail: 1 }); // 滑鼠 click

        expect(p.onOpen).toHaveBeenCalledTimes(1);
    });

    it('shows a play button while paused', () => {
        render(<MiniPlayer {...props({ isPlaying: false })} />);

        expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    });

    describe('tags', () => {
        const REWATCH = props({
            labels: ['Bad Girl大過佬，重溫 12/10（一）', '雲妮鍾情', 'Bad Girl大過佬'],
            tags: ['rewatch', 'today', 'today'],
            index: 0,
        });

        it('should tag the current show 重溫 next to its name, with a blue first dot', () => {
            render(<MiniPlayer {...REWATCH} />);

            const region = screen.getByRole('region');
            const tag = region.querySelector('[data-tag]');
            expect(tag).toHaveAttribute('data-tag', 'rewatch');
            expect(tag).toHaveTextContent('重溫');
            expect(tag).toHaveAttribute('aria-hidden', 'true');
            expect(
                screen.getByRole('button', { name: 'Bad Girl大過佬，重溫 12/10（一）' }),
            ).toHaveAttribute('data-variant', 'blue');
            expect(screen.getByRole('button', { name: '雲妮鍾情' })).toHaveAttribute(
                'data-variant',
                'gold',
            );
        });

        it('should leave untagged dots plain', () => {
            render(<MiniPlayer {...props({ tags: [undefined, undefined, undefined] })} />);

            expect(screen.getByRole('region').querySelectorAll('[data-variant]')).toHaveLength(0);
        });

        it('should tag a today show 今日', () => {
            render(<MiniPlayer {...REWATCH} index={1} />);

            expect(screen.getByRole('region').querySelector('[data-tag]')).toHaveAttribute(
                'data-tag',
                'today',
            );
            expect(screen.getByRole('region')).toHaveTextContent('今日');
        });

        it('should show no tag without tags (drama)', () => {
            render(<MiniPlayer {...props()} />);

            expect(screen.getByRole('region').querySelector('[data-tag]')).toBeNull();
        });

        it('should name the dots group with the given position label', () => {
            render(
                <MiniPlayer
                    {...REWATCH}
                    positionLabel={(index, total) => `第 ${index} 個，共 ${total} 個`}
                />,
            );

            expect(screen.getByRole('group', { name: '第 1 個，共 3 個' })).toBeInTheDocument();
        });
    });
});

describe('MiniPlayer swipe to close', () => {
    const CARD_WIDTH = 360;
    const PRESS_X = 300;
    const PRESS_Y = 10;
    const POINTER_ID = 1;
    /** 未夠長按就放手：長按時間嘅一半 */
    const SHORT_PRESS_MS = LONG_PRESS_MS / 2;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            width: CARD_WIDTH,
        } as DOMRect);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const region = () => screen.getByRole('region');
    const openButton = () => screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

    /** 長按（唔郁）到浮起 */
    const longPress = (target: HTMLElement = region(), x = 300) => {
        fireEvent.pointerDown(target, { clientX: x, clientY: 10, pointerId: 1 });
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    };

    const dragTo = (x: number, target: HTMLElement = region()) => {
        fireEvent.pointerMove(target, { clientX: x, clientY: 12, pointerId: 1 });
        fireEvent.pointerUp(target, { clientX: x, clientY: 12, pointerId: 1 });
    };

    it('lifts after a still long press and swaps the subtitle for the hint', () => {
        render(<MiniPlayer {...props()} />);

        longPress();

        expect(region()).toHaveAttribute('data-armed', 'true');
        expect(region()).toHaveAttribute('data-lifted', 'true');
        expect(screen.getByText('‹‹ 滑動關閉')).toBeInTheDocument();
    });

    it('lifts after a quarter of a second, not before', () => {
        render(<MiniPlayer {...props()} />);

        fireEvent.pointerDown(region(), { clientX: 300, clientY: 10, pointerId: 1 });
        act(() => vi.advanceTimersByTime(249));
        expect(region()).not.toHaveAttribute('data-armed');

        act(() => vi.advanceTimersByTime(1));
        expect(region()).toHaveAttribute('data-armed', 'true');
    });

    // Q-2：未夠長按就放手，之後就算過埋長按時間都唔可以浮起（放手要停計長按）
    it('does not lift when released before the long press, even after the long press time', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const at = { clientX: PRESS_X, clientY: PRESS_Y, pointerId: POINTER_ID };

        fireEvent.pointerDown(region(), at);
        act(() => vi.advanceTimersByTime(SHORT_PRESS_MS));
        fireEvent.pointerUp(region(), at);
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

        expect(region()).not.toHaveAttribute('data-armed');
        expect(region()).not.toHaveAttribute('data-lifted');
        expect(region()).not.toHaveAttribute('data-pressing');
        expect(p.onChange).not.toHaveBeenCalled();
        expect(p.onDismiss).not.toHaveBeenCalled();
    });

    it('does not lift when the finger moves before the long press ends, and still swipes', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        fireEvent.pointerDown(region(), { clientX: 300, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(region(), { clientX: 240, clientY: 10, pointerId: 1 });
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
        fireEvent.pointerUp(region(), { clientX: 200, clientY: 10, pointerId: 1 });

        expect(region()).not.toHaveAttribute('data-armed');
        expect(p.onChange).toHaveBeenCalledWith(0);
    });

    it('closes when dragged past half its width after lifting, without switching show', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress();
        dragTo(300 - CARD_WIDTH / 2 - 10);
        expect(p.onDismiss).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(DISMISS_SLIDE_MS));

        expect(p.onDismiss).toHaveBeenCalledTimes(1);
        expect(p.onChange).not.toHaveBeenCalled();
    });

    it('also closes when lifted, released, then swiped left in a second touch', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress();
        fireEvent.pointerUp(region(), { clientX: 300, clientY: 10, pointerId: 1 });
        fireEvent.pointerDown(region(), { clientX: 320, clientY: 10, pointerId: 1 });
        dragTo(100);
        act(() => vi.advanceTimersByTime(DISMISS_SLIDE_MS));

        expect(p.onDismiss).toHaveBeenCalledTimes(1);
        expect(p.onChange).not.toHaveBeenCalled();
    });

    it('stops on the 關閉 button after a partial drag, which closes when pressed', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress();
        dragTo(240);

        expect(region()).toHaveAttribute('data-revealed', 'true');
        fireEvent.click(screen.getByTestId('mini-player-close'));
        act(() => vi.advanceTimersByTime(DISMISS_SLIDE_MS));
        expect(p.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('folds back to normal after a tiny drag', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress();
        dragTo(290);

        expect(region()).not.toHaveAttribute('data-armed');
        expect(p.onDismiss).not.toHaveBeenCalled();
    });

    it('settles back after the idle time, a tap outside, or Escape', () => {
        render(<MiniPlayer {...props()} />);

        longPress();
        fireEvent.pointerUp(region(), { clientX: 300, clientY: 10, pointerId: 1 });
        act(() => vi.advanceTimersByTime(ARMED_IDLE_MS));
        expect(region()).not.toHaveAttribute('data-armed');

        longPress();
        fireEvent.pointerUp(region(), { clientX: 300, clientY: 10, pointerId: 1 });
        fireEvent.pointerDown(document.body);
        expect(region()).not.toHaveAttribute('data-armed');

        longPress();
        fireEvent.pointerUp(region(), { clientX: 300, clientY: 10, pointerId: 1 });
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(region()).not.toHaveAttribute('data-armed');
    });

    it('settles back when the lifted card is tapped, without opening the show page', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress(openButton());
        fireEvent.pointerUp(openButton(), { clientX: 300, clientY: 10, pointerId: 1 });
        fireEvent.click(openButton(), { detail: 1 });
        expect(p.onOpen).not.toHaveBeenCalled();
        expect(region()).toHaveAttribute('data-armed', 'true');

        fireEvent.pointerDown(openButton(), { clientX: 200, clientY: 10, pointerId: 1 });
        fireEvent.pointerUp(openButton(), { clientX: 200, clientY: 10, pointerId: 1 });
        fireEvent.click(openButton(), { detail: 1 });

        expect(p.onOpen).not.toHaveBeenCalled();
        expect(region()).not.toHaveAttribute('data-armed');
    });

    it('closes straight away when reduced motion is on', () => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress();
        dragTo(20);
        act(() => vi.advanceTimersByTime(0));

        expect(p.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('offers screen reader and keyboard users a plain close button', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        fireEvent.click(screen.getByRole('button', { name: '關閉播放器' }));

        expect(p.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('slides away (data-closing) instead of settling while a full swipe closes', () => {
        render(<MiniPlayer {...props()} />);

        longPress();
        dragTo(20);

        expect(region()).toHaveAttribute('data-closing', 'true');
        expect(region()).not.toHaveAttribute('data-lifted');
    });

    it('keeps the lift while the finger is held past the idle time, so the swipe still closes', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress();
        act(() => vi.advanceTimersByTime(ARMED_IDLE_MS + 10));
        dragTo(20);
        act(() => vi.advanceTimersByTime(DISMISS_SLIDE_MS));

        expect(p.onDismiss).toHaveBeenCalledTimes(1);
        expect(p.onChange).not.toHaveBeenCalled();
    });

    it('ignores Escape while sliding away and still closes once', () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        longPress();
        dragTo(20);
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(region()).toHaveAttribute('data-closing', 'true');
        act(() => vi.advanceTimersByTime(DISMISS_SLIDE_MS));
        expect(p.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('still closes when the page changes during the slide', () => {
        const p = props();
        const { unmount } = render(<MiniPlayer {...p} />);

        longPress();
        dragTo(20);
        unmount();

        expect(p.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('drops a mouse press whose button was released outside the card', () => {
        render(<MiniPlayer {...props()} />);

        fireEvent.pointerDown(region(), { clientX: 300, clientY: 10, pointerId: 1, button: 0 });
        fireEvent.pointerMove(region(), {
            clientX: 290,
            clientY: 60,
            pointerId: 1,
            buttons: 0,
            pointerType: 'mouse',
        });
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

        expect(region()).not.toHaveAttribute('data-armed');
    });

    // Q-3：系統搶咗手勢（來電、瀏覽器捲動）會 pointercancel：唔當放手，彈返平時，唔關閉唔轉節目
    describe('pointercancel', () => {
        /** 拉過成個 card 闊度：如果 cancel 當放手處理就會關閉 */
        const FAR_LEFT_X = PRESS_X - CARD_WIDTH;
        const at = (clientX: number) => ({ clientX, clientY: PRESS_Y, pointerId: POINTER_ID });

        it('springs back to rest without closing when cancelled mid-drag after lifting', () => {
            const p = props();
            render(<MiniPlayer {...p} />);

            longPress();
            fireEvent.pointerMove(region(), at(FAR_LEFT_X));
            expect(region()).toHaveAttribute('data-dragging', 'true');
            fireEvent.pointerCancel(region(), at(FAR_LEFT_X));
            act(() => vi.advanceTimersByTime(DISMISS_SLIDE_MS));

            expect(region()).not.toHaveAttribute('data-armed');
            expect(region()).not.toHaveAttribute('data-dragging');
            expect(region()).not.toHaveAttribute('data-closing');
            expect(region()).toHaveStyle({ '--mini-dismiss-offset': '0px' });
            expect(p.onDismiss).not.toHaveBeenCalled();
            expect(p.onChange).not.toHaveBeenCalled();
        });

        it('cancels the long press when cancelled before it lifts', () => {
            const p = props();
            render(<MiniPlayer {...p} />);

            fireEvent.pointerDown(region(), at(PRESS_X));
            act(() => vi.advanceTimersByTime(SHORT_PRESS_MS));
            fireEvent.pointerCancel(region(), at(PRESS_X));
            act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

            expect(region()).not.toHaveAttribute('data-armed');
            expect(region()).not.toHaveAttribute('data-pressing');
            expect(p.onChange).not.toHaveBeenCalled();
        });
    });

    it('does not lift on a right or middle mouse press', () => {
        render(<MiniPlayer {...props()} />);

        fireEvent.pointerDown(region(), { clientX: 300, clientY: 10, pointerId: 1, button: 2 });
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

        expect(region()).not.toHaveAttribute('data-armed');
    });
});
