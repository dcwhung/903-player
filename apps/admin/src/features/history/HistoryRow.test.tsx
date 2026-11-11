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
});
