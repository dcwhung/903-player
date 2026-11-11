import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';
import { Toggle } from './Toggle';

describe('Toggle', () => {
    it('should expose a named switch and flip on click', async () => {
        const onChange = vi.fn();
        render(<Toggle on label="狀態" onChange={onChange} />);
        const toggle = screen.getByRole('switch', { name: '狀態' });
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        expect(toggle).toHaveTextContent('上架');
        await userEvent.click(toggle);
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('should read 下架 with the red style when off', () => {
        render(<Toggle on={false} label="狀態" onChange={() => {}} />);
        const toggle = screen.getByRole('switch', { name: '狀態' });
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(toggle).toHaveClass('off');
        expect(toggle).toHaveTextContent('下架');
    });
});

describe('Switch', () => {
    it('should mark the selected option as pressed and report changes', async () => {
        const onChange = vi.fn();
        const options = [
            { value: 'series', label: '短篇集' },
            { value: 'daily', label: '每日播' },
        ] as const;
        render(<Switch label="類型" value="series" options={options} onChange={onChange} />);
        const group = screen.getByRole('group', { name: '類型' });
        expect(group).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '短篇集' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: '每日播' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        await userEvent.click(screen.getByRole('button', { name: '每日播' }));
        expect(onChange).toHaveBeenCalledWith('daily');
    });
});
