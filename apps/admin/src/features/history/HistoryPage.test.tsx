import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasIcon } from '../../../tests/icons';
import { fakeData, mockApi, renderAt } from '../../../tests/renderApp';
import { HistoryPage } from './HistoryPage';

const row = (id: number, current: boolean) => ({
    id,
    createdAt: '2026-11-09T14:40:00.000Z',
    createdBy: 'admin@example.com',
    hash: 'h',
    showCount: 1,
    dramaCount: 1,
    episodeCount: 3,
    rollbackOf: null,
    status: 'ok',
    error: null,
    current,
});

describe('HistoryPage rollback', () => {
    it('should explain the new rollback, call the API and refresh admin data', async () => {
        const api = mockApi({
            'GET /api/publishes': () => ({ body: { publishes: [row(2, true), row(1, false)] } }),
            'POST /api/publishes/1/rollback': () => ({ body: { publish: row(3, true) } }),
        });
        const data = fakeData();
        renderAt('/history', '/history', <HistoryPage />, data);
        await userEvent.click(await screen.findByRole('button', { name: '還原至 #1' }));
        expect(screen.getByRole('dialog')).toHaveTextContent(
            '還原至 #1：當時上架的內容會恢復上架，之後新增的會設為下架。',
        );
        expect(screen.getByRole('dialog')).toHaveTextContent(
            '只會還原上架狀態；名稱、簡介、圖片、集數及排程會維持目前版本。',
        );
        await userEvent.click(screen.getByRole('button', { name: '還原' }));
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());
        expect(api.mock.calls.some(([url]) => url === '/api/publishes/1/rollback')).toBe(true);
    });

    it('should say so when there was nothing to restore', async () => {
        mockApi({
            'GET /api/publishes': () => ({ body: { publishes: [row(2, true), row(1, false)] } }),
            'POST /api/publishes/1/rollback': () => ({
                body: { unchanged: true, publish: row(2, true) },
            }),
        });
        renderAt('/history', '/history', <HistoryPage />);
        await userEvent.click(await screen.findByRole('button', { name: '還原至 #1' }));
        await userEvent.click(screen.getByRole('button', { name: '還原' }));
        expect(await screen.findByText('內容與目前版本相同，沒有發佈新版本。')).toBeInTheDocument();
    });

    it('should show the undo icon on the dialog 還原 button', async () => {
        mockApi({
            'GET /api/publishes': () => ({ body: { publishes: [row(2, true), row(1, false)] } }),
        });
        renderAt('/history', '/history', <HistoryPage />);
        await userEvent.click(await screen.findByRole('button', { name: '還原至 #1' }));
        expect(hasIcon(screen.getByRole('button', { name: '還原' }), 'undo-2')).toBe(true);
    });
});
