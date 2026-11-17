import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
