import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateSlider, type DateItem } from './DateSlider';

const ITEMS: DateItem[] = [
    { key: 'a', label: '03/10（六）', watched: true, selected: false },
    { key: 'b', label: '10/10（六）', watched: false, selected: false },
    { key: 'c', label: '17/10（六）', watched: false, selected: true },
];

describe('DateSlider', () => {
    beforeEach(() => {
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('lists dates in order and marks the selected one', () => {
        render(<DateSlider items={ITEMS} onSelect={() => {}} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.map((b) => b.textContent)).toEqual([
            '03/10（六）',
            '10/10（六）',
            '17/10（六）',
        ]);
        expect(buttons[2]).toHaveAttribute('aria-current', 'date');
        expect(buttons[0]).not.toHaveAttribute('aria-current');
    });

    it('shows a tick only on watched dates', () => {
        render(<DateSlider items={ITEMS} onSelect={() => {}} />);

        expect(screen.getAllByRole('img', { name: '已收聽' })).toHaveLength(1);
    });

    it('centres the selected date', () => {
        render(<DateSlider items={ITEMS} onSelect={() => {}} />);

        expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
            expect.objectContaining({ inline: 'center' }),
        );
    });

    it('reports the clicked date', async () => {
        const onSelect = vi.fn();
        render(<DateSlider items={ITEMS} onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: /10\/10/ }));

        expect(onSelect).toHaveBeenCalledWith('b');
    });
});
