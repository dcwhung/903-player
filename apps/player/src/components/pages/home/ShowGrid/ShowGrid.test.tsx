import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowGrid } from './ShowGrid';

const TILES = Array.from({ length: 8 }, (_, i) => (
    <button key={i} type="button">
        {`節目 ${i + 1}`}
    </button>
));
const PAGE_WIDTH_PX = 291;

/** 由 tokens.css 讀嘅值：指示點高、格最矮比例（16:9）、最多高幾多 */
const TOKENS: Record<string, string> = {
    '--touch-target-min': '24px',
    '--tile-aspect-w': '16',
    '--tile-aspect-h': '9',
    '--show-tile-max-grow': '1.3',
};

/** jsdom 冇 layout：分頁容器 widthPx × heightPx，行距 12px，頁內上下冇留白 */
const mockLayout = (
    heightPx: number,
    { widthPx = PAGE_WIDTH_PX, gutterPx = 0, columnGapPx = 0 } = {},
) => {
    const realStyle = window.getComputedStyle.bind(window);
    const values: Record<string, string> = {
        rowGap: '12px',
        columnGap: `${columnGapPx}px`,
        paddingTop: '0',
        paddingBottom: '0',
        paddingLeft: `${gutterPx}px`,
    };
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
        const style = realStyle(el);
        return new Proxy(style, {
            get: (target, key) => {
                if (key === 'getPropertyValue') return (name: string) => TOKENS[name] ?? '';
                if (typeof key === 'string' && key in values) return values[key];
                const value: unknown = Reflect.get(target, key);
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
    });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(heightPx);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(widthPx);
};

describe('ShowGrid', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should keep every tile on one page without dots when they all fit', () => {
        render(<ShowGrid tiles={TILES} label="節目" busy={false} />);

        const nav = screen.getByRole('navigation', { name: '節目' });
        expect(within(nav).getAllByRole('button')).toHaveLength(8);
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it('should keep all 8 tiles on one page and stretch the rows when the screen allows', () => {
        // iPhone 直版 430px 闊、一頁 560px 高：一欄 193px，16:9 最矮 108.6px，4 行放得落 → 每行 131px
        mockLayout(560, { widthPx: 430, gutterPx: 16, columnGapPx: 12 });
        render(<ShowGrid tiles={TILES} label="節目" busy={false} />);

        const nav = screen.getByRole('navigation', { name: '節目' });
        const grid = screen.getByRole('button', { name: '節目 1' }).parentElement;
        expect(within(nav).getAllByRole('button')).toHaveLength(8);
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
        expect(grid).toHaveAttribute('data-fill');
        expect(grid).toHaveStyle({ gridTemplateRows: 'repeat(4, 131px)' });
    });

    it('should split the tiles into pages by height and switch page from the dots', async () => {
        mockLayout(250);
        HTMLElement.prototype.scrollTo = vi.fn();
        render(<ShowGrid tiles={TILES} label="節目" busy={false} />);

        // 250 − 24（指示點）放得落 2 行 → 每頁 4 格，2 頁
        const dots = screen.getByRole('group', { name: '節目第 1 頁，共 2 頁' });
        await userEvent.click(within(dots).getByRole('button', { name: '第 2 頁' }));

        expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ left: PAGE_WIDTH_PX }),
        );
        expect(screen.getByRole('group', { name: '節目第 2 頁，共 2 頁' })).toBeInTheDocument();
    });

    it('should keep every tile on one page in landscape, however short the screen', () => {
        mockLayout(250);
        // 橫版：節目格排成幾欄 × 兩行填滿，唔分頁
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        );
        render(<ShowGrid tiles={TILES} label="節目" busy={false} />);

        expect(within(screen.getByRole('navigation')).getAllByRole('button')).toHaveLength(8);
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it.each([3, 8, 12])(
        'should lay %i tiles out with the banner in the shared phone-sideways grid, none hidden',
        (count) => {
            const tiles = Array.from({ length: count }, (_, i) => (
                <button key={i} type="button">{`節目 ${i + 1}`}</button>
            ));
            render(
                <ShowGrid
                    tiles={tiles}
                    label="節目"
                    busy={false}
                    renderBanner={(n) => <span>{`橫額 ${n}`}</span>}
                />,
            );

            const nav = screen.getByRole('navigation', { name: '節目' });
            expect(within(nav).getAllByRole('button')).toHaveLength(count);
            expect(within(nav).getByText(`橫額 ${count}`)).toBeInTheDocument();
            // 手機打橫唔分頁：冇指示點，用 HomeLandscapeGrid（data-scroll 標住一屏 / strip）
            expect(screen.queryByRole('group')).not.toBeInTheDocument();
            expect(nav).toHaveAttribute('data-scroll', String(count > 8));
        },
    );

    it('should mark the navigation busy while recordings load', () => {
        render(<ShowGrid tiles={TILES} label="節目" busy />);

        expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'true');
    });
});
