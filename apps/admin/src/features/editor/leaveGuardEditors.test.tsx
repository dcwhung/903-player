/*
 * 「未儲存就離開」守衛接落兩個編輯頁（AU-023）：有未儲存改動（劇集連未儲存嘅改 ID、新節目有內容）先問；
 * 編輯頁自己喺儲存 / 刪除之後嘅跳轉唔問
 */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderAt } from '../../../tests/renderApp';
import { DramaEditorPage } from '../dramas/DramaEditor';
import { ShowEditorPage } from '../shows/ShowEditor';

const DRAMA = {
    definition: {
        name: '新劇',
        kind: 'series',
        enabled: false,
        audio: { host: 'r2', folder: '新劇', file: '{no2}.m4a' },
        arcs: [{ id: 'special', name: '特別篇', episodes: 1 }],
    },
    images: {},
    // 從未發佈：ID 改得、刪得
    draft: true,
    updatedAt: 'v1',
};

const SAVED = { body: { updatedAt: 'v2', draft: true, warnings: { missingEpisodeIds: [] } } };

const dramaApi = () =>
    mockApi({
        'GET /api/entries/dramas/fresh': () => ({ body: DRAMA, etag: '"v1"' }),
        'PUT /api/entries/dramas/fresh': () => SAVED,
        'DELETE /api/entries/dramas/fresh': () => ({ body: {} }),
    });

const openDrama = (search = '') =>
    renderAt(`/dramas/fresh${search}`, '/dramas/:id', <DramaEditorPage tab="basic" />);

const summary = () => screen.findByRole('textbox', { name: /^簡介/ });
const leaveDialog = () => screen.findByRole('dialog', { name: '放棄未儲存的變更？' });
const noDialog = () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
const where = async () => (await screen.findByTestId('location')).textContent;
const crumb = (name: string) => userEvent.click(screen.getByRole('link', { name }));

describe('drama editor leave guard (AU-023)', () => {
    it('should ask before leaving through the breadcrumb with an unsaved field, keeping the draft on 留下', async () => {
        dramaApi();
        openDrama();
        await userEvent.type(await summary(), '未儲存');
        await crumb('廣播劇');

        await leaveDialog();
        await userEvent.click(screen.getByRole('button', { name: '留下' }));
        expect(await summary()).toHaveValue('未儲存');
    });

    it('should ask when only an ID change is pending', async () => {
        dramaApi();
        openDrama();
        await userEvent.type(await screen.findByRole('textbox', { name: /^ID/ }), 'x');
        await crumb('廣播劇');

        expect(await leaveDialog()).toBeInTheDocument();
    });

    it('should leave without asking when nothing was changed', async () => {
        dramaApi();
        openDrama();
        await summary();
        await crumb('廣播劇');

        expect(await where()).toBe('/dramas');
        noDialog();
    });

    it('should go back to the todos after 儲存並返回待辦 without asking', async () => {
        dramaApi();
        openDrama('?from=todos');
        await userEvent.type(await summary(), '新簡介');
        await userEvent.click(screen.getByRole('button', { name: '儲存並返回待辦' }));

        expect(await where()).toBe('/');
        noDialog();
    });

    it('should ask before returning to the todos when a title rename leaves other fields unsaved', async () => {
        dramaApi();
        openDrama('?from=todos');
        await userEvent.type(await summary(), '未儲存');
        await userEvent.dblClick(screen.getByText('新劇', { selector: 'h1 *' }));
        await userEvent.type(screen.getByRole('textbox', { name: '名稱' }), '改名{Enter}');

        expect(await leaveDialog()).toBeInTheDocument();
        expect(await summary()).toHaveValue('未儲存');
    });

    it('should go to the list after deleting with unsaved changes without asking', async () => {
        dramaApi();
        openDrama();
        await userEvent.type(await summary(), '未儲存');
        await userEvent.click(screen.getByRole('button', { name: '刪除' }));
        const confirm = await screen.findByRole('dialog', { name: /^刪除/ });
        await userEvent.click(confirm.querySelector('button.danger') as HTMLElement);

        expect(await where()).toBe('/dramas');
        noDialog();
    });
});

describe('show editor leave guard (AU-023)', () => {
    const showApi = () =>
        mockApi({
            'GET /api/entries/shows/waves': () => ({
                body: {
                    definition: { name: '口水多過浪花' },
                    images: {},
                    draft: false,
                    updatedAt: 'v1',
                },
                etag: '"v1"',
            }),
            'PUT /api/entries/shows/abc': () => ({ status: 201, ...SAVED }),
        });

    it('should ask before leaving an existing show with unsaved changes', async () => {
        showApi();
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        await userEvent.type(await summary(), '未儲存');
        await crumb('節目');

        expect(await leaveDialog()).toBeInTheDocument();
    });

    it('should leave an untouched new show without asking', async () => {
        showApi();
        renderAt('/shows/new', '/shows/new', <ShowEditorPage />);
        await summary();
        await crumb('節目');

        expect(await where()).toBe('/shows');
        noDialog();
    });

    it('should ask before leaving a new show that has content', async () => {
        showApi();
        renderAt('/shows/new', '/shows/new', <ShowEditorPage />);
        await userEvent.type(await summary(), '內容');
        await crumb('節目');

        expect(await leaveDialog()).toBeInTheDocument();
    });

    it('should go to the list after the first save of a new show without asking', async () => {
        const api = showApi();
        renderAt('/shows/new', '/shows/new', <ShowEditorPage />);
        await userEvent.type(await screen.findByRole('textbox', { name: /ID/ }), 'abc');
        await userEvent.type(await summary(), 'x');
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));

        await waitFor(() =>
            expect(api.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true),
        );
        expect(await where()).toBe('/shows');
        noDialog();
    });
});
