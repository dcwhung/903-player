import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import { ShowEditorPage } from './ShowEditor';

const SHOW = {
    definition: {
        name: '口水多過浪花',
        fileTime: '1500',
        airDays: [1, 2, 3, 4, 5],
        tile: 'tile.webp',
        disc: 'disc.webp',
        theme: {},
    },
    images: {},
    draft: false,
    updatedAt: '2026-11-10T00:00:00.000Z',
};

const load = () => ({ body: SHOW, etag: '"2026-11-10T00:00:00.000Z"' });

describe('ShowEditor', () => {
    it('should read 儲存 without a flow bar when opened from the list', async () => {
        mockApi({ 'GET /api/entries/shows/waves': load });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        expect(await screen.findByRole('button', { name: '儲存' })).toBeDisabled();
        expect(screen.queryByRole('region', { name: '處理待辦' })).not.toBeInTheDocument();
    });

    it('should save with If-Match and show the dirty field', async () => {
        const api = mockApi({
            'GET /api/entries/shows/waves': load,
            'PUT /api/entries/shows/waves': () => ({
                body: { updatedAt: 'v2', draft: false, warnings: { missingEpisodeIds: [] } },
            }),
        });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        await userEvent.type(await screen.findByRole('textbox', { name: '簡介' }), '新簡介');
        expect(screen.getByText('● 有未儲存的變更（簡介）')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        await waitFor(() => expect(screen.queryByText(/有未儲存的變更/)).not.toBeInTheDocument());
        const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
        expect(new Headers(put?.[1]?.headers).get('if-match')).toBe('"2026-11-10T00:00:00.000Z"');
        expect(JSON.parse(String(put?.[1]?.body)).definition.summary).toBe('新簡介');
    });

    it('should explain a 412 and offer reload', async () => {
        mockApi({
            'GET /api/entries/shows/waves': load,
            'PUT /api/entries/shows/waves': () => ({
                status: 412,
                body: { error: 'entry changed' },
            }),
        });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        await userEvent.type(await screen.findByRole('textbox', { name: '簡介' }), 'x');
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        expect(await screen.findByText(/此劇集已在其他視窗或裝置修改/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '重新載入' })).toBeInTheDocument();
    });

    it('should keep the draft and offer 重新登入 when the session expired', async () => {
        mockApi({
            'GET /api/entries/shows/waves': load,
            'PUT /api/entries/shows/waves': () => ({
                status: 401,
                body: { error: 'not logged in' },
            }),
        });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        const summary = await screen.findByRole('textbox', { name: '簡介' });
        await userEvent.type(summary, '未儲存');
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        expect(await screen.findByText(/登入已逾時/)).toBeInTheDocument();
        expect(screen.queryByText('not logged in')).not.toBeInTheDocument();
        const relogin = screen.getByRole('link', { name: /重新登入/ });
        expect(relogin).toHaveAttribute('href', '/auth/google/start');
        expect(relogin).toHaveAttribute('target', '_blank');
        expect(summary).toHaveValue('未儲存');
    });

    it('should show the flow bar and 儲存並返回待辦 when opened from the todos, then go back', async () => {
        mockApi({
            'GET /api/entries/shows/waves': load,
            'PUT /api/entries/shows/waves': () => ({
                body: { updatedAt: 'v2', draft: false, warnings: { missingEpisodeIds: [] } },
            }),
        });
        const row = {
            kind: 'newDrama' as const,
            findingIds: [1],
            dramaId: 'waves',
            arcId: null,
            name: '口水多過浪花',
            cells: {
                folder: { state: 'na' as const },
                id: { state: 'na' as const },
                images: { state: 'na' as const },
                schedule: { state: 'na' as const },
                summary: { state: 'must' as const, target: '/shows/waves' },
            },
        };
        const data = fakeData({ todos: resource({ rows: [row], blocking: 1 }) });
        renderAt(
            '/shows/waves?from=todos&todo=newDrama%3Awaves%3A',
            '/shows/:id',
            <ShowEditorPage />,
            data,
        );
        expect(await screen.findByRole('region', { name: '處理待辦' })).toHaveTextContent(
            '尚欠：簡介',
        );
        await userEvent.type(screen.getByRole('textbox', { name: '簡介' }), 'x');
        await userEvent.click(screen.getByRole('button', { name: '儲存並返回待辦' }));
        expect(await screen.findByText('other page')).toBeInTheDocument();
        expect(data.refresh).toHaveBeenCalled();
    });

    it('should hide the time boxes until 設定播放時間 is ticked, then write the default range', async () => {
        const api = mockApi({
            'GET /api/entries/shows/waves': load,
            'PUT /api/entries/shows/waves': () => ({
                body: { updatedAt: 'v2', draft: false, warnings: { missingEpisodeIds: [] } },
            }),
        });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        const box = await screen.findByRole('checkbox', { name: '設定播放時間' });
        expect(box).not.toBeChecked();
        expect(screen.queryByRole('button', { name: /開始時間/ })).not.toBeInTheDocument();
        await userEvent.click(box);
        expect(screen.getByRole('button', { name: /開始時間/ })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        await waitFor(() => expect(api.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(true));
        const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
        expect(JSON.parse(String(put?.[1]?.body)).definition.airTime).toEqual({
            start: '15:00',
            end: '16:00',
        });
    });

    it('should drop airTime when 設定播放時間 is unticked', async () => {
        const api = mockApi({
            'GET /api/entries/shows/waves': () => ({
                body: {
                    ...SHOW,
                    definition: { ...SHOW.definition, airTime: { start: '15:00', end: '16:30' } },
                },
                etag: '"2026-11-10T00:00:00.000Z"',
            }),
            'PUT /api/entries/shows/waves': () => ({
                body: { updatedAt: 'v2', draft: false, warnings: { missingEpisodeIds: [] } },
            }),
        });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        const box = await screen.findByRole('checkbox', { name: '設定播放時間' });
        expect(box).toBeChecked();
        await userEvent.click(box);
        expect(screen.queryByRole('button', { name: /開始時間/ })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        await waitFor(() => expect(api.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(true));
        const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
        expect(JSON.parse(String(put?.[1]?.body)).definition).not.toHaveProperty('airTime');
    });
});
