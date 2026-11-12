import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowGrid } from './ShowGrid';

const tilesOf = (count: number) =>
    Array.from({ length: count }, (_, i) => (
        <button key={i} type="button">
            {`節目 ${i + 1}`}
        </button>
    ));
const TILES = tilesOf(8);
const PAGE_WIDTH_PX = 291;
/** iPhone 15 Pro Max / iPhone 15 直版闊度 */
const IPHONE_WIDE_PX = 430;
const IPHONE_15_PX = 393;
const IPHONE_GAPS = { gutterPx: 16, columnGapPx: 12 };
const twoColumns = { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' };

/** 某格所在嗰頁嘅 grid */
const gridOf = (name: string) => screen.getByRole('button', { name }).parentElement;

const stubLandscape = () =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );

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
        expect(grid).toHaveStyle({ gridTemplateRows: 'repeat(4, 131px)', ...twoColumns });
        // 8 格雙數：冇格橫跨
        expect(grid).not.toHaveAttribute('data-span-last');
        // 用戶確認（dynamic-show-grid）：一頁放得晒就置頂，剩低高度留喺最底，唔再 space-between 拉開行距
        expect(grid).not.toHaveAttribute('data-paged');
    });

    it('should stack 1 or 2 tiles in one full-width column, top-aligned (iPhone 15)', () => {
        // 393 − 32 = 361px 一欄，16:9 最矮 203px；2 行 (500 − 12) ÷ 2 = 244 ≤ 203 × 1.3（TOKENS）
        mockLayout(500, { widthPx: IPHONE_15_PX, ...IPHONE_GAPS });
        render(<ShowGrid tiles={tilesOf(2)} label="節目" busy={false} />);

        const grid = gridOf('節目 1');
        expect(grid).toHaveStyle({
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, 244px)',
        });
        expect(grid).not.toHaveAttribute('data-span-last');
        expect(grid).not.toHaveAttribute('data-paged');
    });

    it('should cap one-column rows at the max grow and leave the rest at the bottom', () => {
        // 1 格：361 × 9 / 16 × 1.3（TOKENS --show-tile-max-grow）≈ 264px，唔會拉到 560
        mockLayout(560, { widthPx: IPHONE_15_PX, ...IPHONE_GAPS });
        render(<ShowGrid tiles={tilesOf(1)} label="節目" busy={false} />);

        const rows = gridOf('節目 1')?.style.gridTemplateRows ?? '';
        expect(parseFloat(/,\s*([\d.]+)px/.exec(rows)?.[1] ?? '')).toBeCloseTo(
            361 * (9 / 16) * 1.3,
        );
    });

    it.each([3, 5, 7])(
        'should span the last of %i tiles (today) across both columns on one page',
        (count) => {
            mockLayout(560, { widthPx: IPHONE_WIDE_PX, ...IPHONE_GAPS });
            render(<ShowGrid tiles={tilesOf(count)} label="節目" busy={false} />);

            const grid = gridOf('節目 1');
            expect(grid).toHaveStyle(twoColumns);
            expect(grid).toHaveAttribute('data-span-last');
            expect(grid).not.toHaveAttribute('data-paged');
        },
    );

    it('should span today only on the page that holds it when 9 tiles are paged', () => {
        // 291px 闊兩欄：一欄 145.5px，16:9 最矮 81.8px；250 − 24 放得落 2 行 → 每頁 4 格：4 / 4 / 1
        mockLayout(250);
        render(<ShowGrid tiles={tilesOf(9)} label="節目" busy={false} />);

        expect(screen.getByRole('group', { name: '節目第 1 頁，共 3 頁' })).toBeInTheDocument();
        const first = gridOf('節目 1');
        const last = gridOf('節目 9');
        expect(first).toHaveStyle(twoColumns);
        expect(first).not.toHaveAttribute('data-span-last');
        expect(last).toHaveAttribute('data-span-last');
        // 分頁照 space-between（最後一頁行位跟第一頁）
        expect(first).toHaveAttribute('data-paged');
        expect(last).toHaveAttribute('data-paged');
    });

    it('should split the tiles into pages by height and switch page from the dots', async () => {
        mockLayout(250);
        HTMLElement.prototype.scrollTo = vi.fn();
        render(<ShowGrid tiles={TILES} label="節目" busy={false} />);

        // 250 − 24（指示點）放得落 2 行 → 每頁 4 格，2 頁；要分頁先 space-between
        expect(gridOf('節目 1')).toHaveAttribute('data-paged');
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
        stubLandscape();
        render(<ShowGrid tiles={TILES} label="節目" busy={false} />);

        expect(within(screen.getByRole('navigation')).getAllByRole('button')).toHaveLength(8);
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it.each([2, 5])(
        'should leave the wide-landscape 4-column grid to CSS with %i tiles (no portrait columns / span)',
        (count) => {
            mockLayout(560, { widthPx: 1180 });
            stubLandscape();
            render(<ShowGrid tiles={tilesOf(count)} label="節目" busy={false} />);

            const grid = gridOf('節目 1');
            expect(grid?.style.gridTemplateColumns).toBe('');
            expect(grid).not.toHaveAttribute('data-span-last');
            expect(grid).not.toHaveAttribute('data-paged');
        },
    );

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
