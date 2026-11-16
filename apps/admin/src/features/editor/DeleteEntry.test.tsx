import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { LoadedEntry } from '../../api/types';
import { AdminDataContext } from '../../data/AdminData';
import { hasIcon } from '../../../tests/icons';
import { fakeData, mockApi, renderAt } from '../../../tests/renderApp';
import { DeleteEntry } from './DeleteEntry';

const entry: LoadedEntry = {
    kind: 'shows',
    id: 'waves',
    definition: { name: '口水多過浪花' },
    images: {},
    draft: false,
    updatedAt: 'v1',
    etag: '"v1"',
};

/** 列表 → 編輯頁（history 有兩格），刪除後睇去咗邊、撳「上一頁」會唔會返去已刪除嘅項目 */
const renderFromList = (target: LoadedEntry, refresh: () => Promise<void>) => {
    const list = `/${target.kind}`;
    const router = createMemoryRouter(
        [
            { path: `${list}/:id`, element: <DeleteEntry entry={target} neverPublished /> },
            { path: '*', element: <p>list page</p> },
        ],
        { initialEntries: [list, `${list}/${target.id}`], initialIndex: 1 },
    );
    render(
        <AdminDataContext.Provider value={fakeData({ refresh: vi.fn(refresh) })}>
            <RouterProvider router={router} />
        </AdminDataContext.Provider>,
    );
    return router;
};

const confirmDelete = async () => {
    await userEvent.click(screen.getByRole('button', { name: '刪除' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '刪除' }));
};

describe('DeleteEntry', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('should say a published entry cannot be deleted, in red, without the 下架 hint', () => {
        renderAt('/', '/', <DeleteEntry entry={entry} neverPublished={false} />);
        const note = screen.getByText('已發佈的項目不可刪除。');
        expect(note).toHaveClass('danger-note');
        expect(screen.queryByText(/如需下架/)).not.toBeInTheDocument();
    });

    it('should show the trash icon on the dialog delete button too', async () => {
        renderAt('/', '/', <DeleteEntry entry={entry} neverPublished />);
        await userEvent.click(screen.getByRole('button', { name: '刪除' }));
        const dialog = screen.getByRole('dialog');
        const confirm = dialog.querySelector('button.danger') as HTMLElement;
        expect(hasIcon(confirm, 'trash-2')).toBe(true);
    });

    it.each([
        ['shows', '/shows'],
        ['dramas', '/dramas'],
    ] as const)(
        'should replace the deleted %s entry with its list so Back skips it',
        async (kind, list) => {
            mockApi({ [`DELETE /api/entries/${kind}/waves`]: () => ({ body: { ok: true } }) });
            const router = renderFromList({ ...entry, kind }, () => Promise.resolve());
            await confirmDelete();
            await waitFor(() => expect(router.state.location.pathname).toBe(list));
            await router.navigate(-1);
            expect(router.state.location.pathname).not.toBe(`${list}/waves`);
        },
    );

    it('should go to the list right after the delete, without waiting for the data refresh', async () => {
        mockApi({ 'DELETE /api/entries/shows/waves': () => ({ body: { ok: true } }) });
        // 全部 entry 重讀可以好耐：唔好留喺已刪除嘅編輯頁等
        const router = renderFromList(entry, () => new Promise<void>(() => undefined));
        await confirmDelete();
        await waitFor(() => expect(router.state.location.pathname).toBe('/shows'));
    });

    it('should stay and show the error when the delete fails', async () => {
        mockApi({
            'DELETE /api/entries/shows/waves': () => ({ status: 412, body: { error: '已被修改' } }),
        });
        const router = renderFromList(entry, () => Promise.resolve());
        await confirmDelete();
        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/shows/waves');
    });
});
