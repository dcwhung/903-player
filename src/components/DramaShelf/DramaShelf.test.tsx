import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubLandscape } from '../../../tests/landscape';
import { DramaShelf, type DramaShelfItem } from './DramaShelf';

const item = (overrides: Partial<DramaShelfItem> = {}): DramaShelfItem => ({
    id: 'chisee',
    name: '芝See菇Bi Family',
    art: '/art.webp',
    meta: '10 個短篇',
    onOpen: () => {},
    ...overrides,
});

const metaCorner = () => screen.getByText('10 個短篇').dataset.corner;

describe('DramaShelf', () => {
    it('keeps the 短篇 count bottom-right when there is nothing to continue', () => {
        render(<DramaShelf items={[item()]} />);

        expect(screen.getByRole('button', { name: '芝See菇Bi Family' })).toBeInTheDocument();
        expect(metaCorner()).toBe('bottom');
        expect(screen.queryByText('繼續收聽')).not.toBeInTheDocument();
    });

    it('moves the count top-right to make room for 繼續收聽', () => {
        render(
            <DramaShelf items={[item({ resume: { label: '大妒忌 · 第 2 集', ratio: 0.5 } })]} />,
        );

        expect(
            screen.getByRole('button', { name: '芝See菇Bi Family，繼續收聽 大妒忌 · 第 2 集' }),
        ).toBeInTheDocument();
        expect(metaCorner()).toBe('top');
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

    /** jsdom 冇 layout：每張卡隔 112px、頂留 8px、focus 卡上面露 24px、書架可見 500px 高 */
    const mockShelf = () => {
        const realStyle = window.getComputedStyle.bind(window);
        const values: Record<string, string> = {
            gridAutoRows: '112px',
            paddingTop: '8px',
            scrollPaddingTop: '24px',
        };
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
            const style = realStyle(el);
            return new Proxy(style, {
                get: (target, key) => {
                    if (typeof key === 'string' && key in values) return values[key];
                    const value: unknown = Reflect.get(target, key);
                    return typeof value === 'function' ? value.bind(target) : value;
                },
            });
        });
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500);
        scrollTo = vi.fn();
        HTMLElement.prototype.scrollTo =
            scrollTo as unknown as typeof HTMLElement.prototype.scrollTo;
    };

    const renderShelf = () => {
        const onOpen = NAMES.map(() => vi.fn());
        render(
            <DramaShelf
                items={NAMES.map((name, i) => item({ id: name, name, onOpen: onOpen[i] }))}
            />,
        );
        return onOpen;
    };
    const tile = (name: string) => screen.getByRole('button', { name });
    const focused = () =>
        screen
            .getAllByRole('button')
            .filter((b) => b.hasAttribute('data-focused'))
            .map((b) => b.getAttribute('aria-label'));

    beforeEach(mockShelf);
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('focuses the first card on entering the tab, with room below for the last one', () => {
        renderShelf();

        expect(focused()).toEqual(['劇 1']);
        // 500 − 112 − 24：最尾一張都捲得到 snap 位
        expect(screen.getByRole('navigation')).toHaveStyle({ paddingBottom: '364px' });
    });

    it('scrolls a dimmed card into focus when tapped, without opening it', async () => {
        const onOpen = renderShelf();

        await userEvent.click(tile('劇 3'));

        expect(onOpen[2]).not.toHaveBeenCalled();
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 208 }));
        expect(focused()).toEqual(['劇 3']);
    });

    it('opens the focused card when tapped', async () => {
        const onOpen = renderShelf();

        await userEvent.click(tile('劇 1'));

        expect(onOpen[0]).toHaveBeenCalledTimes(1);
    });

    it('follows the scroll position to pick the focused card', () => {
        renderShelf();
        const shelf = screen.getByRole('navigation');

        shelf.scrollTop = 96;
        fireEvent.scroll(shelf);

        expect(focused()).toEqual(['劇 2']);
    });

    it('brings a card into focus when reached by keyboard, and opens it with Enter', async () => {
        const onOpen = renderShelf();

        await userEvent.tab();
        await userEvent.tab();
        expect(focused()).toEqual(['劇 2']);
        expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 96 }));

        await userEvent.keyboard('{Enter}');
        expect(onOpen[1]).toHaveBeenCalledTimes(1);
    });

    it('opens a dimmed card straight away for a screen reader (click without a pointer)', () => {
        const onOpen = renderShelf();

        fireEvent.click(tile('劇 4'), { detail: 0 });

        expect(onOpen[3]).toHaveBeenCalledTimes(1);
    });

    it('keeps plain tiles that open on tap in landscape (no stacked focus)', async () => {
        stubLandscape();
        const onOpen = renderShelf();

        await userEvent.click(tile('劇 3'));

        expect(onOpen[2]).toHaveBeenCalledTimes(1);
        expect(focused()).toEqual([]);
    });
});
