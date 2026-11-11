import { render, screen } from '@testing-library/react';
import { HistoryRow } from './HistoryRow';

const row = {
    id: 3,
    createdAt: '2026-11-09T14:40:00.000Z',
    createdBy: 'admin@example.com',
    hash: 'h',
    showCount: 1,
    dramaCount: 2,
    episodeCount: 30,
    rollbackOf: null,
    status: 'ok',
    error: null,
    current: false,
};

describe('HistoryRow', () => {
    it('should put the publish time and the admin on separate lines', () => {
        render(<HistoryRow row={row} servingId={3} entries={[]} onRollback={vi.fn()} />);
        expect(screen.getByText('admin')).toHaveClass('who');
        expect(screen.getByText('admin').previousElementSibling).toHaveClass('when');
        expect(screen.getByRole('button', { name: '還原至 #3' })).toBeInTheDocument();
    });

    it('should show 使用中 under #N in the version column and no rollback button', () => {
        render(
            <HistoryRow
                row={{ ...row, current: true }}
                servingId={3}
                entries={[]}
                onRollback={vi.fn()}
            />,
        );
        const pill = screen.getByText('使用中');
        expect(pill.closest('.ver')).not.toBeNull();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should show 失敗 in the version column and no pill for an older ok version', () => {
        const { rerender } = render(
            <HistoryRow
                row={{ ...row, status: 'failed', error: 'x' }}
                servingId={2}
                entries={[]}
                onRollback={vi.fn()}
            />,
        );
        expect(screen.getByText('失敗').closest('.ver')).not.toBeNull();
        rerender(<HistoryRow row={row} servingId={3} entries={[]} onRollback={vi.fn()} />);
        expect(screen.queryByText('使用中')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '還原至 #3' }).closest('.action')).not.toBeNull();
    });
});
