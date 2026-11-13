import { screen, waitFor, within } from '@testing-library/react';
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

    it('should show 未上架 in the title for a disabled show that was never published', async () => {
        const off = { ...SHOW, definition: { ...SHOW.definition, enabled: false } };
        mockApi({ 'GET /api/entries/shows/waves': () => ({ body: off, etag: '"v1"' }) });
        const summary = { ...off, kind: 'shows' as const, id: 'waves', etag: '"v1"' };
        renderAt(
            '/shows/waves',
            '/shows/:id',
            <ShowEditorPage />,
            fakeData({ entries: resource([{ ...summary, published: false }]) }),
        );
        expect(await screen.findByText('未上架', { selector: '.pill' })).toHaveClass('unlisted');
    });

    it.each([
        [false, true],
        [true, false],
    ])(
        'should offer 刪除 only when the show was never listed (published = %s → deletable = %s)',
        async (published, deletable) => {
            // 以下架入過最新 document：changes 冇「新節目」，要靠 GET /api/entries 嘅 published
            const off = { ...SHOW, definition: { ...SHOW.definition, enabled: false } };
            mockApi({ 'GET /api/entries/shows/waves': () => ({ body: off, etag: '"v1"' }) });
            const summary = { ...off, kind: 'shows' as const, id: 'waves', etag: '"v1"' };
            renderAt(
                '/shows/waves',
                '/shows/:id',
                <ShowEditorPage />,
                fakeData({ entries: resource([{ ...summary, published }]) }),
            );
            await screen.findByRole('button', { name: '儲存' });
            expect(screen.queryByRole('button', { name: '刪除' }) !== null).toBe(deletable);
            expect(screen.queryByText('已發佈的項目不可刪除。') !== null).toBe(!deletable);
        },
    );

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
        // 已存在嘅節目：儲存後留喺編輯頁
        expect(screen.queryByText('other page')).not.toBeInTheDocument();
        const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
        expect(new Headers(put?.[1]?.headers).get('if-match')).toBe('"2026-11-10T00:00:00.000Z"');
        expect(JSON.parse(String(put?.[1]?.body)).definition.summary).toBe('新簡介');
    });

    it('should go back to the show list with a toast after the first save of a new show', async () => {
        const api = mockApi({
            'PUT /api/entries/shows/abc': () => ({
                status: 201,
                body: { updatedAt: 'v1', draft: true, warnings: { missingEpisodeIds: [] } },
            }),
        });
        const data = fakeData();
        renderAt('/shows/new', '/shows/new', <ShowEditorPage />, data);
        await userEvent.type(await screen.findByRole('textbox', { name: /ID/ }), 'abc');
        await userEvent.type(screen.getByRole('textbox', { name: '簡介' }), 'x');
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        expect(await screen.findByText('other page')).toBeInTheDocument();
        expect(screen.getByText('已新增「abc」')).toBeInTheDocument();
        expect(data.refresh).toHaveBeenCalled();
        const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
        expect(new Headers(put?.[1]?.headers).get('if-none-match')).toBe('*');
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
            key: 'newDrama/waves',
            publish: 'incomplete' as const,
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

    it('should split 基本資料 and 配色 into tabs, with no theme on the basic tab', async () => {
        mockApi({ 'GET /api/entries/shows/waves': load });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        const tabs = await screen.findByRole('navigation', { name: '節目分頁' });
        expect(within(tabs).getByRole('link', { name: '基本資料' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(within(tabs).getByRole('link', { name: '配色' })).toHaveAttribute(
            'href',
            '/shows/waves/theme',
        );
        expect(
            screen.queryByRole('region', { name: '口水多過浪花 · 配色' }),
        ).not.toBeInTheDocument();
    });

    it('should show only the theme picker on the 配色 tab, without a visible title', async () => {
        mockApi({ 'GET /api/entries/shows/waves': load });
        renderAt('/shows/waves/theme', '/shows/:id/theme', <ShowEditorPage tab="theme" />);
        expect(
            await screen.findByRole('region', { name: '口水多過浪花 · 配色' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: '口水多過浪花 · 配色' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '儲存' })).not.toBeInTheDocument();
    });

    it('should not show tabs for a new show', async () => {
        renderAt('/shows/new', '/shows/new', <ShowEditorPage />, fakeData({}));
        expect(await screen.findByRole('button', { name: '儲存' })).toBeInTheDocument();
        expect(screen.queryByRole('navigation', { name: '節目分頁' })).not.toBeInTheDocument();
    });
});
