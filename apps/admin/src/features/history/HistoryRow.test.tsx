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
        render(
            <HistoryRow
                row={row}
                servingId={3}
                entries={[]}
                onRollback={vi.fn()}
                onRedeploy={vi.fn()}
            />,
        );
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
                onRedeploy={vi.fn()}
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
                onRedeploy={vi.fn()}
            />,
        );
        expect(screen.getByText('失敗').closest('.ver')).not.toBeNull();
        rerender(
            <HistoryRow
                row={row}
                servingId={3}
                entries={[]}
                onRollback={vi.fn()}
                onRedeploy={vi.fn()}
            />,
        );
        expect(screen.queryByText('使用中')).not.toBeInTheDocument();
        // 還原掣喺版本欄最底（冇「操作」欄）
        const rollback = screen.getByRole('button', { name: '還原至 #3' });
        expect(rollback.closest('.ver')).not.toBeNull();
        expect(rollback.closest('.ver')?.lastElementChild).toBe(rollback);
        expect(document.querySelector('.action')).toBeNull();
    });

    it('should show 更換首頁 Banner instead of 沒有內容變更 when only the banner changed', () => {
        render(
            <HistoryRow
                row={{ ...row, changes: { items: [], timeline: [], bannerChanged: true } }}
                servingId={3}
                entries={[]}
                onRollback={vi.fn()}
                onRedeploy={vi.fn()}
            />,
        );
        expect(screen.queryByText('沒有內容變更')).not.toBeInTheDocument();
        const name = screen.getByText('首頁 Banner');
        expect(name).toHaveClass('name');
        expect(name.previousElementSibling?.previousElementSibling).toHaveTextContent('更換');
    });

    it('should list the banner change after the other changes when both changed', () => {
        const item = {
            kind: 'unlist',
            when: 'now',
            entry: { kind: 'dramas', id: 'golden', name: '黃金少年' },
            detail: {},
        } as const;
        render(
            <HistoryRow
                row={{ ...row, changes: { items: [item], timeline: [], bannerChanged: true } }}
                servingId={3}
                entries={[]}
                onRollback={vi.fn()}
                onRedeploy={vi.fn()}
            />,
        );
        const names = [...document.querySelectorAll('.changes .name')].map((el) => el.textContent);
        expect(names).toEqual(['黃金少年', '首頁 Banner']);
    });

    it('should still say 沒有內容變更 when the banner did not change or the field is missing', () => {
        const { rerender } = render(
            <HistoryRow
                row={{ ...row, changes: { items: [], timeline: [], bannerChanged: false } }}
                servingId={3}
                entries={[]}
                onRollback={vi.fn()}
                onRedeploy={vi.fn()}
            />,
        );
        expect(screen.getByText('沒有內容變更')).toBeInTheDocument();
        rerender(
            <HistoryRow
                row={{ ...row, changes: { items: [], timeline: [] } }}
                servingId={3}
                entries={[]}
                onRollback={vi.fn()}
                onRedeploy={vi.fn()}
            />,
        );
        expect(screen.getByText('沒有內容變更')).toBeInTheDocument();
        expect(screen.queryByText('首頁 Banner')).not.toBeInTheDocument();
    });

    describe('stats line', () => {
        const STATS = '1 節目 · 2 劇 · 30 集';
        const item = {
            kind: 'unlist',
            when: 'now',
            entry: { kind: 'dramas', id: 'golden', name: '黃金少年' },
            detail: {},
        } as const;
        const renderRow = (changes: Record<string, unknown>) =>
            render(
                <HistoryRow
                    row={{ ...row, changes: { items: [], timeline: [], ...changes } }}
                    servingId={3}
                    entries={[]}
                    onRollback={vi.fn()}
                    onRedeploy={vi.fn()}
                />,
            );

        it('should show the stats when shows / dramas changed', () => {
            renderRow({ items: [item], bannerChanged: true });
            expect(screen.getByText(STATS)).toBeInTheDocument();
        });

        it.each([
            ['banner-only', { bannerChanged: true }],
            ['branding-only', { brandingChanged: true }],
        ])('should hide the stats for a %s publish', (_label, changes) => {
            renderRow(changes);
            expect(screen.queryByText(STATS)).not.toBeInTheDocument();
        });

        it('should still show the error of a failed banner-only publish', () => {
            render(
                <HistoryRow
                    row={{
                        ...row,
                        status: 'failed',
                        error: 'R2 down',
                        changes: { items: [], timeline: [], bannerChanged: true },
                    }}
                    servingId={2}
                    entries={[]}
                    onRollback={vi.fn()}
                    onRedeploy={vi.fn()}
                />,
            );
            expect(screen.getByText(/R2 down/)).toBeInTheDocument();
        });
    });
});
