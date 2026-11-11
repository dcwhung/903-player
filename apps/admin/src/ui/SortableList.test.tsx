import { act, fireEvent, render, screen } from '@testing-library/react';
import { SortableList } from './SortableList';

const ROW_HEIGHT = 40;
const ITEMS = ['甲', '乙', '丙'];

/** jsdom 冇 layout：按 data-index 砌返直排嘅 rect，dnd-kit 鍵盤座標先計得到 */
const stubLayout = () =>
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
    ) {
        const row = this.closest('[data-index]');
        const index = Number(row?.getAttribute('data-index') ?? 0);
        const top = index * ROW_HEIGHT;
        return {
            x: 0,
            y: top,
            top,
            left: 0,
            right: 300,
            bottom: top + ROW_HEIGHT,
            width: 300,
            height: ROW_HEIGHT,
            toJSON: () => ({}),
        } as DOMRect;
    });

const renderList = (onReorder: (ids: string[]) => void) =>
    render(
        <ol>
            <SortableList
                items={ITEMS}
                idOf={(item) => item}
                labelOf={(item) => item}
                onReorder={onReorder}
                renderItem={(item, sortable) => (
                    <li
                        ref={sortable.setNodeRef}
                        style={sortable.style}
                        data-index={ITEMS.indexOf(item)}
                    >
                        {sortable.handle}
                        {item}
                    </li>
                )}
            />
        </ol>,
    );

const press = async (target: Element, code: string) => {
    await act(async () => {
        fireEvent.keyDown(target, { code, key: code });
        // dnd-kit 喺 effect / rAF 量度 rect：等一下先撳下一粒
        await new Promise((resolve) => setTimeout(resolve, 20));
    });
};

describe('SortableList keyboard', () => {
    it('should give each handle a Chinese label', () => {
        renderList(() => {});
        expect(screen.getByRole('button', { name: '拖曳以調整「乙」的次序' })).toBeInTheDocument();
    });

    it('should move an item down with Space, ArrowDown, Space', async () => {
        stubLayout();
        const onReorder = vi.fn();
        renderList(onReorder);
        const handle = screen.getByRole('button', { name: '拖曳以調整「甲」的次序' });
        handle.focus();
        await press(handle, 'Space');
        await press(handle, 'ArrowDown');
        await press(handle, 'Space');
        expect(onReorder).toHaveBeenCalledWith(['乙', '甲', '丙']);
    });

    it('should not reorder when Esc cancels', async () => {
        stubLayout();
        const onReorder = vi.fn();
        renderList(onReorder);
        const handle = screen.getByRole('button', { name: '拖曳以調整「甲」的次序' });
        handle.focus();
        await press(handle, 'Space');
        await press(handle, 'ArrowDown');
        await press(handle, 'Escape');
        expect(onReorder).not.toHaveBeenCalled();
    });
});
