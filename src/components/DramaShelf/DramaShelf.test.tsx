import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubLandscape } from '../../../tests/landscape';
import { DramaShelf, type DramaShelfItem } from './DramaShelf';

const item = (overrides: Partial<DramaShelfItem> = {}): DramaShelfItem => ({
    id: 'chisee',
    name: '芝See菇Bi Family',
    art: '/art.webp',
    meta: '10 個短篇',
    onOpen: () => {},
    onResume: () => {},
    ...overrides,
});

const RESUME = { label: '大妒忌 · 第 2 集', ratio: 0.5 };
const CONTINUE_NAME = '芝See菇Bi Family，繼續收聽 大妒忌 · 第 2 集';

const metaCorner = () => screen.getByText('10 個短篇').dataset.corner;

describe('DramaShelf', () => {
    it('keeps the 短篇 count bottom-right when there is nothing to continue', () => {
        render(<DramaShelf items={[item()]} />);

        expect(screen.getByRole('button', { name: '芝See菇Bi Family' })).toBeInTheDocument();
        expect(metaCorner()).toBe('bottom');
        expect(screen.queryByText('繼續收聽')).not.toBeInTheDocument();
    });

    it('moves the count top-right to make room for 繼續收聽', () => {
        render(<DramaShelf items={[item({ resume: RESUME })]} />);

        expect(screen.getByRole('button', { name: CONTINUE_NAME })).toBeInTheDocument();
        expect(metaCorner()).toBe('top');
    });

    it('plays from the 繼續收聽 strip without opening the drama', async () => {
        const onOpen = vi.fn();
        const onResume = vi.fn();
        render(<DramaShelf items={[item({ resume: RESUME, onOpen, onResume })]} />);

        await userEvent.click(screen.getByRole('button', { name: CONTINUE_NAME }));

        expect(onResume).toHaveBeenCalledTimes(1);
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('opens the drama from the rest of the tile without playing', async () => {
        const onOpen = vi.fn();
        const onResume = vi.fn();
        render(<DramaShelf items={[item({ resume: RESUME, onOpen, onResume })]} />);

        await userEvent.click(screen.getByRole('button', { name: '芝See菇Bi Family' }));

        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onResume).not.toHaveBeenCalled();
    });

    it('shows 新 top-left and reads out why', () => {
        render(<DramaShelf items={[item({ newLabel: '有新短篇' })]} />);

        const tile = screen.getByRole('button', { name: '芝See菇Bi Family，有新短篇' });
        expect(tile).toHaveTextContent('新');
    });

    it.each([1, 4, 9])(
        'puts the banner and all %i dramas in the shared phone-sideways grid, none hidden',
        (count) => {
            const items = Array.from({ length: count }, (_, i) =>
                item({ id: `d${i}`, name: `劇 ${i + 1}` }),
            );
            render(<DramaShelf items={items} renderBanner={(n) => <span>{`橫額 ${n}`}</span>} />);

            const nav = screen.getByRole('navigation', { name: '廣播劇' });
            expect(within(nav).getAllByRole('button')).toHaveLength(count);
            expect(within(nav).getByText(`橫額 ${count}`)).toBeInTheDocument();
            expect(nav).toHaveAttribute('data-scroll', String(count > 8));
        },
    );
});

describe('DramaShelf focus (portrait stacked cards)', () => {
    const NAMES = ['劇 1', '劇 2', '劇 3', '劇 4'];
    let scrollTo: ReturnType<typeof vi.fn>;
    // jsdom 冇 element.scrollTo（spyOn 唔到），自己裝假嘅；用完還原，唔好漏去其他 test
    const realScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');
    const restoreScrollTo = () => {
        if (realScrollTo) Object.defineProperty(HTMLElement.prototype, 'scrollTo', realScrollTo);
        else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
    };

    /** 由 tokens.css 讀嘅值：卡間距、focus 卡上面露幾多、卡最矮 / 最高比例、疊卡間距最細、捽幾遠先當捽 */
    const TOKENS: Record<string, string> = {
        '--home-tile-gap': '12px',
        '--drama-shelf-peek': '24px',
        '--drama-shelf-min-ratio': '0.5',
        '--drama-shelf-max-ratio': '0.6',
        '--drama-shelf-min-step': '72px',
        '--drama-shelf-scrub-slop': '8px',
    };

    /**
     * jsdom 冇 layout：書架 430px 闊（左右留白 16px → 卡闊 398px，最矮 199px）、上下留白 8px。
     * 預設 400px 高（扣走留白 384px）：4 張要疊到間距 62px，細過 72px → 固定 72px 上下捲
     */
    const realStyle = window.getComputedStyle.bind(window);
    const mockShelf = (heightPx = 400) => {
        vi.restoreAllMocks();
        const values: Record<string, string> = {
            paddingTop: '8px',
            paddingBottom: '8px',
            paddingLeft: '16px',
            paddingRight: '16px',
        };
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
            const style = realStyle(el);
            return new Proxy(style, {
                get: (target, key) => {
                    if (key === 'getPropertyValue') {
                        return (name: string) => TOKENS[name] ?? target.getPropertyValue(name);
                    }
                    if (typeof key === 'string' && key in values) return values[key];
                    const value: unknown = Reflect.get(target, key);
                    return typeof value === 'function' ? value.bind(target) : value;
                },
            });
        });
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(heightPx);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(430);
        scrollTo = vi.fn();
        HTMLElement.prototype.scrollTo =
            scrollTo as unknown as typeof HTMLElement.prototype.scrollTo;
    };

    const renderShelf = (names = NAMES) => {
        const onOpen = names.map(() => vi.fn());
        render(
            <DramaShelf
                items={names.map((name, i) => item({ id: name, name, onOpen: onOpen[i] }))}
            />,
        );
        return onOpen;
    };
    const tile = (name: string) => screen.getByRole('button', { name });
    // data-focused 喺卡（外框）度；讀返卡入面入頁掣個名
    const focused = () =>
        Array.from(document.querySelectorAll('[data-focused]')).map((card) =>
            card.querySelector('button')?.getAttribute('aria-label'),
        );

    beforeEach(() => mockShelf());
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        restoreScrollTo();
    });

    it('focuses the first card on entering the tab, with room below for the last one', () => {
        renderShelf();

        expect(focused()).toEqual(['劇 1']);
        // 400 − 72 − 24：最尾一張都捲得到 snap 位
        const shelf = screen.getByRole('navigation');
        expect(shelf).toHaveAttribute('data-scroll');
        expect(shelf.style.paddingBottom).toBe('304px');
        expect(shelf.style.getPropertyValue('--drama-shelf-step')).toBe('72px');
    });

    it('scrolls a dimmed card into focus when tapped, without opening it', async () => {
        const onOpen = renderShelf();

        await userEvent.click(tile('劇 3'));

        expect(onOpen[2]).not.toHaveBeenCalled();
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 128 }));
        expect(focused()).toEqual(['劇 3']);
    });

    it('opens the focused card when tapped', async () => {
        const onOpen = renderShelf();

        await userEvent.click(tile('劇 1'));

        expect(onOpen[0]).toHaveBeenCalledTimes(1);
    });

    it('only focuses a dimmed card when its 繼續收聽 strip is tapped, then plays on the next tap', async () => {
        const onResume = vi.fn();
        render(
            <DramaShelf
                items={NAMES.map((name, i) =>
                    item({ id: name, name, ...(i === 2 && { resume: RESUME, onResume }) }),
                )}
            />,
        );
        const strip = screen.getByRole('button', { name: '劇 3，繼續收聽 大妒忌 · 第 2 集' });

        await userEvent.click(strip);
        expect(onResume).not.toHaveBeenCalled();
        expect(focused()).toEqual(['劇 3']);

        await userEvent.click(strip);
        expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('follows the scroll position to pick the focused card', () => {
        renderShelf();
        const shelf = screen.getByRole('navigation');

        shelf.scrollTop = 56;
        fireEvent.scroll(shelf);

        expect(focused()).toEqual(['劇 2']);
    });

    it('brings a card into focus when reached by keyboard, and opens it with Enter', async () => {
        const onOpen = renderShelf();

        await userEvent.tab();
        await userEvent.tab();
        expect(focused()).toEqual(['劇 2']);
        expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 56 }));

        await userEvent.keyboard('{Enter}');
        expect(onOpen[1]).toHaveBeenCalledTimes(1);
    });

    it('opens a dimmed card straight away for a screen reader (click without a pointer)', () => {
        const onOpen = renderShelf();

        fireEvent.click(tile('劇 4'), { detail: 0 });

        expect(onOpen[3]).toHaveBeenCalledTimes(1);
    });

    it('overlaps the cards down to the bottom without scrolling when they fit', () => {
        // 650px 高（扣走留白 634px）：(634 − 199) ÷ 3 = 145，最後一張卡底到書架底
        mockShelf(650);
        renderShelf();

        const shelf = screen.getByRole('navigation');
        expect(shelf).not.toHaveAttribute('data-scroll');
        expect(shelf.style.getPropertyValue('--drama-shelf-step')).toBe('145px');
        expect(shelf.style.getPropertyValue('--drama-shelf-card')).toBe('199px');
        expect(shelf.style.paddingBottom).toBe('');
    });

    it('makes a dimmed card the focus straight away when the shelf does not scroll', async () => {
        mockShelf(650);
        const onOpen = renderShelf();

        await userEvent.click(tile('劇 3'));
        expect(onOpen[2]).not.toHaveBeenCalled();
        expect(scrollTo).not.toHaveBeenCalled();
        expect(focused()).toEqual(['劇 3']);

        await userEvent.click(tile('劇 3'));
        expect(onOpen[2]).toHaveBeenCalledTimes(1);
    });

    it('brings a card into focus by keyboard without scrolling when the shelf does not scroll', async () => {
        mockShelf(650);
        renderShelf();

        await userEvent.tab();
        await userEvent.tab();

        expect(focused()).toEqual(['劇 2']);
        expect(scrollTo).not.toHaveBeenCalled();
    });

    /**
     * 手指喺書架上下捽（jsdom 書架頂喺 0，clientY 就係由書架頂量起）。
     * 650px 高唔使捲：卡頂 8、153、298、443（間距 145）
     */
    const TOUCH = { pointerId: 1, pointerType: 'touch', button: 0 };
    const press = (name: string, clientY: number) =>
        fireEvent.pointerDown(tile(name), { ...TOUCH, clientY });
    // 手指一直喺撳落嗰張卡度（touch 隱式 capture），move / up 都係嗰張發
    const drag = (name: string, clientY: number) =>
        fireEvent.pointerMove(tile(name), { ...TOUCH, clientY });
    const lift = (name: string, clientY: number) =>
        fireEvent.pointerUp(tile(name), { ...TOUCH, clientY });

    it('moves the focus to the card under the finger while scrubbing the stack', () => {
        mockShelf(650);
        renderShelf();

        press('劇 1', 50);
        drag('劇 1', 55);
        // 未郁夠 8px：仲係撳緊，唔當捽
        expect(focused()).toEqual(['劇 1']);
        drag('劇 1', 320);
        expect(focused()).toEqual(['劇 3']);
        drag('劇 1', 160);
        expect(focused()).toEqual(['劇 2']);
        drag('劇 1', 600);
        expect(focused()).toEqual(['劇 4']);
        expect(scrollTo).not.toHaveBeenCalled();
    });

    it('keeps the scrubbed card focused on release without opening it, and eats the click after', () => {
        mockShelf(650);
        const onOpen = renderShelf();

        press('劇 1', 50);
        drag('劇 1', 320);
        lift('劇 1', 320);
        fireEvent.click(tile('劇 1'), { detail: 1 });

        expect(onOpen.every((open) => open.mock.calls.length === 0)).toBe(true);
        expect(focused()).toEqual(['劇 3']);
    });

    it('opens the scrubbed card on the next plain tap', () => {
        mockShelf(650);
        const onOpen = renderShelf();
        press('劇 1', 50);
        drag('劇 1', 320);
        // iOS 捽完通常冇 click：唔可以食咗下一下真正嘅撳
        lift('劇 1', 320);

        press('劇 3', 320);
        lift('劇 3', 320);
        fireEvent.click(tile('劇 3'), { detail: 1 });

        expect(onOpen[2]).toHaveBeenCalledTimes(1);
    });

    it('still lets the keyboard pick and open cards after a scrub', async () => {
        mockShelf(650);
        const onOpen = renderShelf();
        press('劇 1', 50);
        drag('劇 1', 320);
        lift('劇 1', 320);

        await userEvent.tab();
        expect(focused()).toEqual(['劇 1']);
        await userEvent.keyboard('{Enter}');
        expect(onOpen[0]).toHaveBeenCalledTimes(1);
    });

    it('treats a tap that wobbles less than the slop as a plain tap', () => {
        mockShelf(650);
        const onOpen = renderShelf();

        press('劇 3', 320);
        drag('劇 3', 325);
        lift('劇 3', 325);
        fireEvent.click(tile('劇 3'), { detail: 1 });

        expect(focused()).toEqual(['劇 3']);
        expect(onOpen[2]).not.toHaveBeenCalled();
    });

    it('leaves the focus to the scroll snap when the shelf scrolls (no scrub)', () => {
        renderShelf();
        const shelf = screen.getByRole('navigation');
        expect(shelf).toHaveAttribute('data-scroll');

        press('劇 1', 50);
        drag('劇 1', 300);
        lift('劇 1', 300);

        expect(focused()).toEqual(['劇 1']);
        expect(scrollTo).not.toHaveBeenCalled();
    });

    /** 假 ResizeObserver：記住 callback，test 自己觸發（模擬書架變高 / 矮） */
    const stubResizeObserver = () => {
        const observer = { trigger: () => {} };
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: () => void) {
                    observer.trigger = callback;
                }
                observe = vi.fn();
                disconnect = vi.fn();
            },
        );
        return observer;
    };
    /** 書架改高度（例如 mini player 出入），再等 ResizeObserver 通知 */
    const resizeShelf = (observer: { trigger: () => void }, heightPx: number) => {
        mockShelf(heightPx);
        act(() => observer.trigger());
    };

    it('scrolls the focused card to the snap position when the shelf starts to scroll', async () => {
        const observer = stubResizeObserver();
        mockShelf(650);
        renderShelf();
        await userEvent.click(tile('劇 3'));

        // mini player 出現，書架縮到 400px：要捲，snap 位要係 focus 嗰張（2 × 72 + 8 − 24）
        resizeShelf(observer, 400);

        const shelf = screen.getByRole('navigation');
        expect(shelf).toHaveAttribute('data-scroll');
        expect(shelf.scrollTop).toBe(128);
        expect(focused()).toEqual(['劇 3']);
    });

    /**
     * 真瀏覽器會將 scrollTop 截到 scrollHeight − clientHeight（jsdom 唔會）。
     * scrollHeight 由而家 DOM 上嘅 inline layout 計：上留白 + 最尾一張卡底 + 底留位（冇就用留白）
     */
    const clampScrollTop = (shelf: HTMLElement) => {
        const SHELF_PAD_PX = 8;
        let top = 0;
        const scrollHeight = () => {
            const step = parseFloat(shelf.style.getPropertyValue('--drama-shelf-step'));
            const card = parseFloat(shelf.style.getPropertyValue('--drama-shelf-card'));
            const rows = shelf.querySelectorAll('button').length;
            const content = Math.max(rows * step, (rows - 1) * step + card);
            const bottom = parseFloat(shelf.style.paddingBottom) || SHELF_PAD_PX;
            return SHELF_PAD_PX + content + bottom;
        };
        Object.defineProperty(shelf, 'scrollTop', {
            configurable: true,
            get: () => top,
            set: (value: number) => {
                top = Math.min(Math.max(0, value), scrollHeight() - shelf.clientHeight);
            },
        });
    };

    it('keeps a lower focused card at its snap position when a full shelf starts to scroll (W-465)', async () => {
        const SEVEN = ['劇 1', '劇 2', '劇 3', '劇 4', '劇 5', '劇 6', '劇 7'];
        const observer = stubResizeObserver();
        // 650px 高：7 張疊到間距 72.5px 都放得落，唔使捲
        mockShelf(650);
        renderShelf(SEVEN);
        const shelf = screen.getByRole('navigation');
        clampScrollTop(shelf);
        await userEvent.click(tile('劇 5'));

        // mini player 出現，書架縮到 550px：要捲。舊 layout 最多只捲到 100px，
        // 一定要等新 layout（72px 間距 + 底留位）commit 咗先捲去 4 × 72 + 8 − 24
        resizeShelf(observer, 550);
        fireEvent.scroll(shelf);

        expect(shelf).toHaveAttribute('data-scroll');
        expect(shelf.scrollTop).toBe(272);
        expect(focused()).toEqual(['劇 5']);
    });

    it('keeps a lower focused card when a scrolling shelf grows enough to stop scrolling (CUI-0002)', async () => {
        // 3 × 72 + 8 − 24：劇 4 嘅 snap 位
        const SNAPPED_TOP_PX = 200;
        const observer = stubResizeObserver();
        mockShelf(650);
        renderShelf();
        const shelf = screen.getByRole('navigation');
        clampScrollTop(shelf);
        await userEvent.click(tile('劇 4'));
        // mini player 出現，書架縮到 400px：要捲，捲去劇 4 嘅 snap 位
        resizeShelf(observer, 400);
        fireEvent.scroll(shelf);
        expect(shelf.scrollTop).toBe(SNAPPED_TOP_PX);

        // mini player 消失，書架一下子返去 650px：DOM 仲係舊 layout（要捲、有底留位），
        // 瀏覽器喺 ResizeObserver 之前就截短 scrollTop 再觸發 scroll，唔可以照舊 layout 改 focus
        mockShelf(650);
        // 截短係瀏覽器重新 layout 時做：用新 clientHeight、舊 inline layout 再 set 一次
        shelf.scrollTop = SNAPPED_TOP_PX;
        fireEvent.scroll(shelf);
        act(() => observer.trigger());
        fireEvent.scroll(shelf);

        expect(shelf).not.toHaveAttribute('data-scroll');
        expect(shelf.scrollTop).toBe(0);
        expect(focused()).toEqual(['劇 4']);
    });

    it('scrolls back to the top when the shelf stops scrolling', () => {
        const observer = stubResizeObserver();
        renderShelf();
        const shelf = screen.getByRole('navigation');
        shelf.scrollTop = 128;
        fireEvent.scroll(shelf);

        // 書架變高到 650px：唔使捲，overflow: hidden 都會留住 scrollTop，要自己捲返頂
        resizeShelf(observer, 650);

        expect(shelf).not.toHaveAttribute('data-scroll');
        expect(shelf.scrollTop).toBe(0);
    });

    it('keeps plain tiles that open on tap in landscape (no stacked focus)', async () => {
        stubLandscape();
        const onOpen = renderShelf();

        await userEvent.click(tile('劇 3'));

        expect(onOpen[2]).toHaveBeenCalledTimes(1);
        expect(focused()).toEqual([]);
    });
});
