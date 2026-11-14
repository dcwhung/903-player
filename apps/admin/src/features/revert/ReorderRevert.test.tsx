import type { ChangeItem } from '@903-player/catalog';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import { getChanges } from '../../api/publishEndpoints';
import type { ChangesResponse } from '../../api/types';
import { PublishPage } from '../update/PublishPage';

vi.mock('../../api/publishEndpoints', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/publishEndpoints')>()),
    getChanges: vi.fn(),
}));

const shows: ChangeItem = { kind: 'reorder', when: 'now', detail: { list: 'shows' } };
const dramas: ChangeItem = { kind: 'reorder', when: 'now', detail: { list: 'dramas' } };

const changesOf = (items: ChangeItem[]): ChangesResponse => ({
    base: 1,
    changes: { items, timeline: items.length > 0 ? [{ when: 'now', items }] : [] },
    validation: { ok: true, episodeCount: 10 },
});

const show = (items: ChangeItem[] = [shows, dramas]) => {
    const changes = changesOf(items);
    vi.mocked(getChanges).mockResolvedValue(changes);
    const data = fakeData({ changes: resource(changes), entries: resource([]) });
    renderAt('/publish', '/publish', <PublishPage />, data);
    return data;
};

const card = (title: string) => screen.getByText(title).closest('.tl-entry') as HTMLElement;

describe('publish page reorder (#6)', () => {
    it('should show one card per list with a 修改 tag and a 還原 button', async () => {
        show();
        await screen.findByText('節目排序已更改');
        const showCard = card('節目排序已更改');
        expect(within(showCard).getByText('修改')).toHaveClass('tl-tag', 'edit');
        expect(within(showCard).getByRole('button', { name: '還原節目排序' })).toHaveClass(
            'revert-btn',
        );
        expect(
            within(card('廣播劇排序已更改')).getByRole('button', { name: '還原廣播劇排序' }),
        ).toBeInTheDocument();
        expect(within(showCard).queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should let a reorder alone be published and count it as an edit', async () => {
        show([shows]);
        await screen.findByText('節目排序已更改');
        await waitFor(() => expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled());
        const edits = screen.getByText('修改', { selector: '.stat-label' });
        expect(edits.closest('.stat')).toHaveTextContent('1');
    });

    it('should revert the whole list, toast 已還原排序 and reload everything', async () => {
        const fetchMock = mockApi({
            'POST /api/order/shows/revert': () => ({ body: { updated: 3 } }),
        });
        const data = show();
        await userEvent.click(await screen.findByRole('button', { name: '還原節目排序' }));
        const dialog = screen.getByRole('dialog', { name: '還原排序？' });
        expect(within(dialog).getByRole('checkbox', { name: '還原排序' })).toBeChecked();
        vi.mocked(getChanges).mockResolvedValue(changesOf([dramas]));
        await userEvent.click(within(dialog).getByRole('button', { name: '還原 1 項' }));
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]![0]).toBe('/api/order/shows/revert');
        expect(fetchMock.mock.calls[0]![1]!.method).toBe('POST');
        expect(screen.getByText('已還原排序')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(getChanges).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.queryByText('節目排序已更改')).not.toBeInTheDocument());
        // S-1007：卡冇咗 → focus 去標題
        await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
    });

    it('should keep the dialog open with a written-Chinese message on 409 notPublished', async () => {
        mockApi({
            'POST /api/order/dramas/revert': () => ({
                status: 409,
                body: { error: 'nothing has been published', reason: 'notPublished' },
            }),
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '還原廣播劇排序' }));
        await userEvent.click(screen.getByRole('button', { name: '還原 1 項' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('此項目尚未發佈，無法還原');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should grey out the confirm button when 排序 is unticked', async () => {
        show();
        await userEvent.click(await screen.findByRole('button', { name: '還原節目排序' }));
        await userEvent.click(screen.getByRole('checkbox', { name: '還原排序' }));
        expect(screen.getByRole('button', { name: '還原 0 項' })).toBeDisabled();
    });
});
