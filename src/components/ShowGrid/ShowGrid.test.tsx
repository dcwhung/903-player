import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowGrid } from './ShowGrid';

const TILES = Array.from({ length: 8 }, (_, i) => (
    <button key={i} type="button">
        {`節目 ${i + 1}`}
    </button>
));
const PAGE_WIDTH_PX = 291;

/** jsdom 冇 layout：分頁容器高 heightPx，一格 69px，行距 12px，指示點 24px，頁內上下冇留白 */
const mockLayout = (heightPx: number) => {
    const realStyle = window.getComputedStyle.bind(window);
    const values: Record<string, string> = { rowGap: '12px', paddingTop: '0', paddingBottom: '0' };
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
        const style = realStyle(el);
        return new Proxy(style, {
            get: (target, key) => {
                if (key === 'getPropertyValue') {
                    return (name: string) => (name === '--touch-target-min' ? '24px' : '');
                }
                if (typeof key === 'string' && key in values) return values[key];
                const value: unknown = Reflect.get(target, key);
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
    });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(heightPx);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(PAGE_WIDTH_PX);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        height: 69,
    } as DOMRect);
};

describe('ShowGrid', () => {
    afterEach(() => vi.restoreAllMocks());

    it('should keep every tile on one page without dots when they all fit', () => {
        render(<ShowGrid tiles={TILES} label="節目" busy={false} />);

        const nav = screen.getByRole('navigation', { name: '節目' });
        expect(within(nav).getAllByRole('button')).toHaveLength(8);
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
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

    it('should mark the navigation busy while recordings load', () => {
        render(<ShowGrid tiles={TILES} label="節目" busy />);

        expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'true');
    });
});
