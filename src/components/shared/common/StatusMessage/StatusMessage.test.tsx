import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusMessage } from './StatusMessage';

describe('StatusMessage', () => {
    it('shows a message without a retry button by default', () => {
        render(<StatusMessage message="載入中…" />);

        expect(screen.getByRole('status')).toHaveTextContent('載入中…');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('offers a retry action', async () => {
        const onRetry = vi.fn();
        render(<StatusMessage message="未能載入" onRetry={onRetry} />);

        await userEvent.click(screen.getByRole('button', { name: '重試' }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });
});
