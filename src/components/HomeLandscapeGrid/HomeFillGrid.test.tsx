import { act, render, screen } from '@testing-library/react';
import { SHOW_TILE_RATIO } from './fillShape';
import { HomeFillGrid } from './HomeFillGrid';

/** 假版面：nav 嘅 clientWidth / clientHeight（其他元素都一樣，但只有 nav 會量） */
const layout = { width: 0, height: 0 };

const tiles = (count: number) =>
    Array.from({ length: count }, (_, i) => (
        <button key={`t${i}`} type="button">
            {`卡 ${i + 1}`}
        </button>
    ));

const renderGrid = (count: number, layoutKey?: string) =>
    render(
        <HomeFillGrid
            label="節目"
            tiles={tiles(count)}
            banner={<span>橫額</span>}
            tileRatio={SHOW_TILE_RATIO}
            layoutKey={layoutKey}
        />,
    );

const pages = () =>
    [...screen.getByRole('navigation').querySelectorAll<HTMLElement>('[data-fill-page]')].map(
        (page) => ({
            cols: page.style.getPropertyValue('--fill-cols'),
            rows: page.style.getPropertyValue('--fill-rows'),
            names: [...page.children].map((cell) =>
                (cell as HTMLElement).style.getPropertyValue('view-transition-name'),
            ),
        }),
    );

/** mockup 1012 × 562 冇 mini player：格仔範圍 968 × 452，加返左右留白同陰影位 */
const PHONE_TALL = { width: 968 + 2 * 16, height: 452 + 8 };

describe('HomeFillGrid', () => {
    beforeEach(() => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
            () => layout.width,
        );
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
            () => layout.height,
        );
    });
    afterEach(() => vi.restoreAllMocks());

    it('should lay out the measured box on the first paint, with no fallback shape', () => {
        Object.assign(layout, PHONE_TALL);

        renderGrid(8);

        expect(pages()).toHaveLength(1);
        expect(pages()[0]).toMatchObject({ cols: '3', rows: '3' });
    });

    it('should re-measure in the same commit when the layout key changes', () => {
        Object.assign(layout, { width: 600, height: PHONE_TALL.height });
        const { rerender } = renderGrid(5, 'split');
        const split = pages()[0];

        Object.assign(layout, PHONE_TALL);
        act(() =>
            rerender(
                <HomeFillGrid
                    label="節目"
                    tiles={tiles(5)}
                    banner={<span>橫額</span>}
                    tileRatio={SHOW_TILE_RATIO}
                    layoutKey="fill"
                />,
            ),
        );

        expect(pages()[0]).not.toEqual(split);
        expect(pages()[0]).toMatchObject({ cols: '3', rows: '2' });
    });

    it('should scale the spacing by --ui-scale', () => {
        Object.assign(layout, PHONE_TALL);
        document.documentElement.style.setProperty('--ui-scale', '1.3');

        renderGrid(8);
        document.documentElement.style.removeProperty('--ui-scale');

        // 每格最矮 120 × 1.3：放唔落三行
        expect(Number(pages()[0]?.rows)).toBeLessThan(3);
    });

    it('should name only the cells of the page on screen for view transitions', () => {
        Object.assign(layout, PHONE_TALL);

        renderGrid(20);

        const [first, second] = pages();
        expect(first?.names.every((name) => name !== '')).toBe(true);
        expect(new Set(first?.names).size).toBe(first?.names.length);
        expect(second?.names.every((name) => name === '')).toBe(true);
    });
});
