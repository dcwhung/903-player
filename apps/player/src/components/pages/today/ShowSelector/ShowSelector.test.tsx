import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowSelector, type ShowSelectorItem } from './ShowSelector';

const ITEMS: ShowSelectorItem[] = [
    { key: 'a', name: '在晴朗的一天出發', art: '/a.webp', available: true },
    { key: 'b', name: 'Bad Girl大過佬', art: '/b.webp', available: true },
    { key: 'c', name: '口水多過浪花', art: '/c.webp', available: false },
];

const group = () => screen.getByRole('list', { name: '揀今日節目' });

describe('ShowSelector', () => {
    beforeEach(() => {
        HTMLElement.prototype.scrollTo = vi.fn();
    });

    it('should list every show as a cell with its name in broadcast order', () => {
        render(<ShowSelector items={ITEMS} selectedKey="a" onSelect={vi.fn()} />);

        const cells = within(group()).getAllByRole('listitem');
        expect(cells.map((cell) => cell.textContent)).toEqual([
            '在晴朗的一天出發',
            'Bad Girl大過佬',
            '口水多過浪花',
        ]);
    });

    it('should mark only the selected show as current', () => {
        render(<ShowSelector items={ITEMS} selectedKey="b" onSelect={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Bad Girl大過佬' })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.getByRole('button', { name: '在晴朗的一天出發' })).not.toHaveAttribute(
            'aria-current',
        );
    });

    it('should switch show when an available cell is pressed', async () => {
        const onSelect = vi.fn();
        render(<ShowSelector items={ITEMS} selectedKey="a" onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: 'Bad Girl大過佬' }));

        expect(onSelect).toHaveBeenCalledWith('b');
    });

    it('should disable a show that is not up yet and say so', async () => {
        const onSelect = vi.fn();
        render(<ShowSelector items={ITEMS} selectedKey="a" onSelect={onSelect} />);

        const off = screen.getByRole('button', { name: '口水多過浪花，未上架' });
        expect(off).toBeDisabled();
        await userEvent.click(off);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('should reach every available cell with Tab', async () => {
        render(<ShowSelector items={ITEMS} selectedKey="a" onSelect={vi.fn()} />);

        await userEvent.tab();
        expect(screen.getByRole('button', { name: '在晴朗的一天出發' })).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: 'Bad Girl大過佬' })).toHaveFocus();
    });

    it('should scroll the selected cell into view when it is past the visible edge', () => {
        const scrollTo = vi.fn();
        HTMLElement.prototype.scrollTo = scrollTo;
        // jsdom 冇 layout：第二格喺 100–196，可見闊度 150
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(150);
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(96);
        vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
            this: HTMLElement,
        ) {
            return this.dataset['index'] === undefined ? 0 : Number(this.dataset['index']) * 100;
        });

        const { rerender } = render(
            <ShowSelector items={ITEMS} selectedKey="a" onSelect={vi.fn()} />,
        );
        expect(scrollTo).not.toHaveBeenCalled();

        rerender(<ShowSelector items={ITEMS} selectedKey="b" onSelect={vi.fn()} />);

        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 46 }));
        vi.restoreAllMocks();
    });
});
