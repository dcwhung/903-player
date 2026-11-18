import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListButton } from './ListButton';

describe('ListButton', () => {
    it('should name the button with its label and say it opens a dialog', () => {
        render(<ListButton label="集數清單，共 4 集" count={4} open={false} onToggle={vi.fn()} />);

        const button = screen.getByRole('button', { name: '集數清單，共 4 集' });
        expect(button).toHaveAttribute('aria-haspopup', 'dialog');
        expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should show the count as a badge that screen readers skip', () => {
        render(<ListButton label="集數清單，共 4 集" count={4} open={false} onToggle={vi.fn()} />);

        const badge = screen.getByText('4');
        expect(badge.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('should not show a badge when the count is zero', () => {
        render(<ListButton label="集數清單" count={0} open={false} onToggle={vi.fn()} />);

        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should report expanded while the list is open', () => {
        render(<ListButton label="集數清單" count={4} open onToggle={vi.fn()} />);

        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('should toggle when pressed', async () => {
        const onToggle = vi.fn();
        render(<ListButton label="集數清單" count={4} open={false} onToggle={onToggle} />);

        await userEvent.click(screen.getByRole('button'));

        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});
