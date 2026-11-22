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

    it('should use the unified light red revert style on both 還原 buttons', async () => {
        mockApi({
            'GET /api/publishes': () => ({ body: { publishes: [row(2, true), row(1, false)] } }),
        });
        renderAt('/history', '/history', <HistoryPage />);
        const rowButton = await screen.findByRole('button', { name: '還原至 #1' });
        expect(rowButton).toHaveClass('revert-btn');
        await userEvent.click(rowButton);
        expect(screen.getByRole('button', { name: '還原' })).toHaveClass(
            'revert-btn',
            'dialog-revert',
        );
    });
});

/** 部署失敗嘅版本：DeployCell 出「重新部署 #id」掣（QA 2026-11-13 補 useRedeploy 測試） */
const failedDeploy = (id: number) => ({
    ...row(id, true),
    deploy: 'failed',
    deployRequestedAt: '2026-11-13T10:00:00.000Z',
});

describe('HistoryPage redeploy', () => {
    it('should toast and reload the list after a successful redeploy', async () => {
        const api = mockApi({
            'GET /api/publishes': () => ({ body: { publishes: [failedDeploy(2)] } }),
            'POST /api/publishes/2/deploy': () => ({
                body: { deploy: 'triggered', deployRequestedAt: '2026-11-13T10:05:00.000Z' },
            }),
        });
        renderAt('/history', '/history', <HistoryPage />);
        await userEvent.click(await screen.findByRole('button', { name: '重新部署 #2' }));
        expect(await screen.findByText('已重新開始部署 #2')).toBeInTheDocument();
        await waitFor(() =>
            expect(api.mock.calls.filter(([url]) => url === '/api/publishes')).toHaveLength(2),
        );
    });

    it('should toast the error and keep the list when the redeploy fails', async () => {
        const api = mockApi({
            'GET /api/publishes': () => ({ body: { publishes: [failedDeploy(2)] } }),
            'POST /api/publishes/2/deploy': () => ({
                status: 502,
                body: { error: 'dispatch failed' },
            }),
        });
        renderAt('/history', '/history', <HistoryPage />);
        await userEvent.click(await screen.findByRole('button', { name: '重新部署 #2' }));
        expect(await screen.findByText(/^重新部署失敗：/)).toBeInTheDocument();
        expect(api.mock.calls.filter(([url]) => url === '/api/publishes')).toHaveLength(1);
    });
});

/** 指定 URL 嘅回應扣住，叫 release 先放行（睇進行中狀態） */
const holdRoute = (api: ReturnType<typeof mockApi>, url: string) => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const respond = api.getMockImplementation();
    if (!respond) throw new Error('mockApi has no implementation');
    api.mockImplementation(async (input, init) => {
        if (input === url) await gate;
        return respond(input, init);
    });
    return release;
};

const callsTo = (api: ReturnType<typeof mockApi>, url: string) =>
    api.mock.calls.filter(([input]) => input === url);

const ROLLBACK_1 = '/api/publishes/1/rollback';
const DEPLOY_2 = '/api/publishes/2/deploy';
const threeRows = () => ({ body: { publishes: [row(3, true), row(2, false), row(1, false)] } });
const rolledBack = () => ({ body: { publish: row(4, true) } });

const confirmRollbackTo1 = async () => {
    await userEvent.click(await screen.findByRole('button', { name: '還原至 #1' }));
    await userEvent.click(screen.getByRole('button', { name: '還原' }));
};

/** AU-025：進行中唔可以再撳、成功有 toast */
describe('HistoryPage busy state', () => {
    it('should disable the 還原 buttons while a rollback is running', async () => {
        const api = mockApi({
            'GET /api/publishes': threeRows,
            [`POST ${ROLLBACK_1}`]: rolledBack,
        });
        const release = holdRoute(api, ROLLBACK_1);
        renderAt('/history', '/history', <HistoryPage />);
        await confirmRollbackTo1();
        expect(screen.getByRole('button', { name: '還原至 #1' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '還原至 #2' })).toBeDisabled();
        expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(screen.getByRole('button', { name: '還原至 #2' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        release();
        await waitFor(() =>
            expect(screen.getByRole('button', { name: '還原至 #2' })).toBeEnabled(),
        );
        expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false');
        expect(callsTo(api, ROLLBACK_1)).toHaveLength(1);
    });

    it('should toast once the rollback has published a new version', async () => {
        mockApi({ 'GET /api/publishes': threeRows, [`POST ${ROLLBACK_1}`]: rolledBack });
        renderAt('/history', '/history', <HistoryPage />);
        await confirmRollbackTo1();
        expect(await screen.findByText('已還原至 #1')).toBeInTheDocument();
    });

    it('should show the failure, without a success toast, when the rollback fails', async () => {
        mockApi({
            'GET /api/publishes': threeRows,
            [`POST ${ROLLBACK_1}`]: () => ({ status: 500, body: { error: 'boom' } }),
        });
        renderAt('/history', '/history', <HistoryPage />);
        await confirmRollbackTo1();
        expect(await screen.findByRole('alert')).toHaveTextContent(/^還原失敗：/);
        expect(screen.queryByText('已還原至 #1')).not.toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByRole('button', { name: '還原至 #1' })).toBeEnabled(),
        );
    });

    it('should disable 重新部署 and 還原 while a redeploy is running', async () => {
        const api = mockApi({
            'GET /api/publishes': () => ({ body: { publishes: [failedDeploy(2), row(1, false)] } }),
            [`POST ${DEPLOY_2}`]: () => ({
                body: { deploy: 'triggered', deployRequestedAt: '2026-11-13T10:05:00.000Z' },
            }),
        });
        const release = holdRoute(api, DEPLOY_2);
        renderAt('/history', '/history', <HistoryPage />);
        const redeployButton = await screen.findByRole('button', { name: '重新部署 #2' });
        await userEvent.click(redeployButton);
        expect(redeployButton).toBeDisabled();
        expect(screen.getByRole('button', { name: '還原至 #1' })).toBeDisabled();
        await userEvent.click(redeployButton);
        release();
        expect(await screen.findByText('已重新開始部署 #2')).toBeInTheDocument();
        expect(callsTo(api, DEPLOY_2)).toHaveLength(1);
    });
});

/** AU-025：載入失敗唔當係「未有記錄」 */
describe('HistoryPage load errors', () => {
    it('should show the load error instead of the empty state, and retry', async () => {
        let failing = true;
        const api = mockApi({
            'GET /api/publishes': () =>
                failing
                    ? { status: 500, body: { error: 'boom' } }
                    : { body: { publishes: [row(1, true)] } },
        });
        renderAt('/history', '/history', <HistoryPage />);
        expect(await screen.findByRole('alert')).toHaveTextContent(/^載入失敗：/);
        expect(screen.queryByText('尚未有發佈記錄。')).not.toBeInTheDocument();
        failing = false;
        await userEvent.click(screen.getByRole('button', { name: '重試' }));
        expect(await screen.findByText('使用中')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(callsTo(api, '/api/publishes')).toHaveLength(2);
    });

    it('should explain an expired session when the list cannot load', async () => {
        mockApi({ 'GET /api/publishes': () => ({ status: 401, body: { error: 'unauthorized' } }) });
        renderAt('/history', '/history', <HistoryPage />);
        expect(await screen.findByRole('alert')).toHaveTextContent(/^載入失敗：/);
        expect(screen.queryByText('尚未有發佈記錄。')).not.toBeInTheDocument();
    });

    /** 冇 data 又讀唔到：唔出空表頭 /「共 0 次」（睇落似「讀到、零記錄」） */
    it('should hide the table and the count when nothing could be loaded', async () => {
        let failing = true;
        mockApi({
            'GET /api/publishes': () =>
                failing
                    ? { status: 500, body: { error: 'boom' } }
                    : { body: { publishes: [row(1, true)] } },
        });
        renderAt('/history', '/history', <HistoryPage />);
        await screen.findByRole('alert');
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.queryByText(/^共 \d+ 次$/)).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '發佈 / 部署' })).toBeInTheDocument();
        failing = false;
        await userEvent.click(screen.getByRole('button', { name: '重試' }));
        expect(await screen.findByRole('table')).toBeInTheDocument();
        expect(screen.getByText('共 1 次')).toBeInTheDocument();
    });

    it('should keep the loaded table and count when a later reload fails', async () => {
        let failing = false;
        mockApi({
            'GET /api/publishes': () =>
                failing
                    ? { status: 500, body: { error: 'boom' } }
                    : { body: { publishes: [failedDeploy(2)] } },
            [`POST ${DEPLOY_2}`]: () => ({
                body: { deploy: 'triggered', deployRequestedAt: null },
            }),
        });
        renderAt('/history', '/history', <HistoryPage />);
        const redeployButton = await screen.findByRole('button', { name: '重新部署 #2' });
        failing = true;
        await userEvent.click(redeployButton);
        expect(await screen.findByRole('alert')).toHaveTextContent(/^載入失敗：/);
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('共 1 次')).toBeInTheDocument();
    });
});
