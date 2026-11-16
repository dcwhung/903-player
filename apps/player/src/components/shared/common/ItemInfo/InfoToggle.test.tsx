import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoToggle } from './InfoToggle';

describe('InfoToggle', () => {
    it('should be an icon-only button that reports whether the info is expanded', () => {
        render(<InfoToggle expanded={false} label="劇集資料" onToggle={vi.fn()} />);
        const button = screen.getByRole('button', { name: '劇集資料' });
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(button).toHaveTextContent('');
    });

    it('should call onToggle when pressed', async () => {
        const onToggle = vi.fn();
        render(<InfoToggle expanded label="劇集資料" onToggle={onToggle} />);
        const button = screen.getByRole('button', { name: '劇集資料' });
        expect(button).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(button);
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});
