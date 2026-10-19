import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerControls } from './PlayerControls';

describe('PlayerControls', () => {
    it('orders buttons as −60 −30 play +30 +60', () => {
        render(<PlayerControls isPlaying={false} onToggle={() => {}} onSkip={() => {}} />);

        expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
            '後退 60 秒',
            '後退 30 秒',
            '播放',
            '前進 30 秒',
            '前進 60 秒',
        ]);
    });

    it('shows pause while playing', () => {
        render(<PlayerControls isPlaying onToggle={() => {}} onSkip={() => {}} />);

        expect(screen.getByRole('button', { name: '暫停' })).toBeInTheDocument();
    });

    it('calls handlers', async () => {
        const onToggle = vi.fn();
        const onSkip = vi.fn();
        render(<PlayerControls isPlaying={false} onToggle={onToggle} onSkip={onSkip} />);

        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        await userEvent.click(screen.getByRole('button', { name: '後退 60 秒' }));
        await userEvent.click(screen.getByRole('button', { name: '前進 30 秒' }));

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onSkip).toHaveBeenNthCalledWith(1, -60);
        expect(onSkip).toHaveBeenNthCalledWith(2, 30);
    });
});
