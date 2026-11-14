import type { ChangeItem } from '@903-player/catalog';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import { getChanges } from '../../api/publishEndpoints';
import type { ChangesResponse, LoadedEntry } from '../../api/types';
import { PublishPage } from '../update/PublishPage';

vi.mock('../../api/publishEndpoints', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/publishEndpoints')>()),
    getChanges: vi.fn(),
}));

const lancy = { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' } as const;
const half = { id: 'half', name: '戀愛二分一', label: '戀愛二分一' };

const entry: LoadedEntry = {
    kind: 'dramas',
    id: 'lancy',
    definition: { name: '蘭茜夫人劇場', arcs: [{ id: 'half', name: '戀愛二分一', summary: '新' }] },
    images: { 'arcs/half/tile.webp': 'new.webp' },
    draft: false,
    updatedAt: 'v2',
    etag: '"v2"',
    publishedVersion: {
        definition: {
            name: '蘭茜夫人劇場',
            arcs: [{ id: 'half', name: '戀愛二分一', summary: '舊' }],
        },
        images: { 'arcs/half/tile.webp': 'old.webp' },
    },
};

const items: ChangeItem[] = [
    {
        kind: 'newArc',
        when: 'now',
        entry: lancy,
        arc: { id: 'n', name: '新', label: '新' },
        detail: {},
    },
    { kind: 'edit', when: 'now', entry: lancy, arc: half, detail: { fields: ['tile', 'summary'] } },
];

const changes: ChangesResponse = {
    base: 1,
    changes: { items, timeline: [{ when: 'now', items }] },
    validation: { ok: true, episodeCount: 10 },
};

const SAVED = { updatedAt: 'v3', draft: false, warnings: { missingEpisodeIds: [] } };

const show = () => {
    vi.mocked(getChanges).mockResolvedValue(changes);
    const data = fakeData({ changes: resource(changes), entries: resource([entry]) });
    renderAt('/publish', '/publish', <PublishPage />, data);
    return data;
};

describe('publish page revert', () => {
    it('should revert only the ticked fields, toast and reload everything', async () => {
        const fetchMock = mockApi({
            'POST /api/entries/dramas/lancy/revert': () => ({ body: SAVED }),
        });
        const data = show();
        const buttons = await screen.findAllByRole('button', { name: '還原戀愛二分一' });
        expect(buttons).toHaveLength(1);
        await userEvent.click(buttons[0]!);
        const dialog = screen.getByRole('dialog', { name: '還原戀愛二分一？' });
        expect(within(dialog).getByText('選擇要還原至已發佈版本的項目：')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: '還原 2 項' })).toBeEnabled();
        await userEvent.click(within(dialog).getByRole('checkbox', { name: '還原簡介' }));
        expect(within(dialog).getByText('舊').closest('.diff-row')).toHaveClass('off');
        await userEvent.click(within(dialog).getByRole('button', { name: '還原 1 項' }));
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());
        const init = fetchMock.mock.calls[0]![1]!;
        expect(JSON.parse(init.body as string)).toEqual({
            items: [{ arc: 'half', field: 'tile' }],
        });
        expect(new Headers(init.headers).get('if-match')).toBe('"v2"');
        expect(screen.getByText('已還原戀愛二分一')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(getChanges).toHaveBeenCalledTimes(2));
    });

    it('should grey out the confirm button when nothing is ticked', async () => {
        show();
        await userEvent.click(await screen.findByRole('button', { name: '還原戀愛二分一' }));
        await userEvent.click(screen.getByRole('checkbox', { name: '還原橫圖' }));
        await userEvent.click(screen.getByRole('checkbox', { name: '還原簡介' }));
        expect(screen.getByRole('button', { name: '還原 0 項' })).toBeDisabled();
    });

    it('should keep the dialog open with a written-Chinese message on 409', async () => {
        mockApi({
            'POST /api/entries/dramas/lancy/revert': () => ({
                status: 409,
                body: { error: 'entry has no published version', reason: 'notPublished' },
            }),
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '還原戀愛二分一' }));
        await userEvent.click(screen.getByRole('button', { name: '還原 2 項' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('此項目尚未發佈，無法還原');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close, reload and ask to retry on 412', async () => {
        mockApi({
            'POST /api/entries/dramas/lancy/revert': () => ({ status: 412, body: { error: 'x' } }),
        });
        const data = show();
        await userEvent.click(await screen.findByRole('button', { name: '還原戀愛二分一' }));
        await userEvent.click(screen.getByRole('button', { name: '還原 2 項' }));
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());
        expect(
            screen.getByText('資料已在其他視窗更新，已重新載入，請再試一次'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
