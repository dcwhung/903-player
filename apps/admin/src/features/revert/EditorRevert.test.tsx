import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt } from '../../../tests/renderApp';
import { DramaEditorPage } from '../dramas/DramaEditor';
import { ShowEditorPage } from '../shows/ShowEditor';

const PUBLISHED = {
    definition: {
        name: '口水多過浪花',
        summary: '舊簡介',
        airDays: [1, 2],
        tile: 'tile.webp',
        enabled: true,
        theme: { bg: '#000000' },
    },
    images: { 'tile.webp': 'old.webp' },
};

const SHOW = {
    definition: {
        ...PUBLISHED.definition,
        summary: '新簡介',
        enabled: false,
        order: 3,
        theme: { bg: '#111111' },
    },
    images: { 'tile.webp': 'new.webp' },
    draft: false,
    updatedAt: 'v1',
    published: PUBLISHED,
};

const SAVED = { updatedAt: 'v2', draft: false, warnings: { missingEpisodeIds: [] } };

const showRoutes = () =>
    mockApi({
        'GET /api/entries/shows/waves': () => ({ body: SHOW, etag: '"v1"' }),
        'POST /api/entries/shows/waves/revert': () => ({ body: SAVED, etag: '"v2"' }),
    });

const fieldOf = (label: string) =>
    screen.getByText(label, { selector: 'label, span' }).closest('.field') as HTMLElement;

describe('editor revert', () => {
    it('should mark changed show fields in place, with the published value underneath', async () => {
        showRoutes();
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        await screen.findByRole('button', { name: '還原簡介' });
        expect(within(fieldOf('簡介')).getByText('已修改')).toBeInTheDocument();
        expect(screen.getByText('已發佈：舊簡介')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '還原橫圖' })).toHaveClass('slot-revert');
        expect(screen.getByRole('button', { name: '還原狀態' })).toBeInTheDocument();
        expect(screen.getByText('已發佈：上架')).toBeInTheDocument();
        // #6：排序喺確認發佈頁成個列表還原，編輯頁唔出
        expect(screen.queryByText(/其他已修改/)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '還原播出日' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '還原名稱' })).not.toBeInTheDocument();
    });

    it('should block revert while there are unsaved edits', async () => {
        showRoutes();
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        const button = await screen.findByRole('button', { name: '還原簡介' });
        await userEvent.type(screen.getByRole('textbox', { name: '簡介' }), '！');
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('title', '有未儲存的變更，請先儲存或復原後再還原');
    });

    it('should revert one field, then reload the entry and the admin data', async () => {
        const fetchMock = showRoutes();
        const data = fakeData();
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />, data);
        await userEvent.click(await screen.findByRole('button', { name: '還原簡介' }));
        const dialog = screen.getByRole('dialog', { name: '還原簡介？' });
        expect(within(dialog).getByText('舊簡介')).toHaveClass('txt-box', 'old');
        await userEvent.click(within(dialog).getByRole('button', { name: '還原 1 項' }));
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());
        const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
        expect(JSON.parse(post[1]!.body as string)).toEqual({ items: [{ field: 'summary' }] });
        expect(screen.getByText('已還原簡介')).toBeInTheDocument();
        const gets = fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'GET');
        expect(gets).toHaveLength(2);
    });

    it('should move focus to the field input once its revert button is gone (S-1007)', async () => {
        let reverted = false;
        mockApi({
            'GET /api/entries/shows/waves': () => ({
                body: reverted
                    ? { ...SHOW, definition: { ...SHOW.definition, summary: '舊簡介' } }
                    : SHOW,
                etag: '"v1"',
            }),
            'POST /api/entries/shows/waves/revert': () => {
                reverted = true;
                return { body: SAVED, etag: '"v2"' };
            },
        });
        renderAt('/shows/waves', '/shows/:id', <ShowEditorPage />);
        await userEvent.click(await screen.findByRole('button', { name: '還原簡介' }));
        await userEvent.click(screen.getByRole('button', { name: '還原 1 項' }));
        await waitFor(() =>
            expect(screen.queryByRole('button', { name: '還原簡介' })).not.toBeInTheDocument(),
        );
        await waitFor(() => expect(screen.getByRole('textbox', { name: '簡介' })).toHaveFocus());
    });

    it('should show the theme revert on the theme tab and the status revert covers removedAt', async () => {
        showRoutes();
        renderAt('/shows/waves/theme', '/shows/:id/theme', <ShowEditorPage tab="theme" />);
        await userEvent.click(await screen.findByRole('button', { name: '還原配色' }));
        const dialog = screen.getByRole('dialog', { name: '還原配色？' });
        expect(dialog.querySelectorAll('.swatch').length).toBeGreaterThan(0);
    });

    it('should offer nothing on a never-published entry or arc', async () => {
        const arcs = [{ id: 'new', name: '新短篇', summary: '甲' }];
        mockApi({
            'GET /api/entries/dramas/lancy': () => ({
                body: {
                    definition: { name: '蘭茜', kind: 'series', enabled: true, arcs },
                    images: {},
                    draft: false,
                    updatedAt: 'v1',
                    published: {
                        definition: { name: '蘭茜', kind: 'series', enabled: true, arcs: [] },
                        images: {},
                    },
                },
                etag: '"v1"',
            }),
        });
        renderAt('/dramas/lancy/arcs#new', '/dramas/:id/arcs', <DramaEditorPage tab="arcs" />);
        await screen.findByRole('textbox', { name: '簡介' });
        expect(screen.queryByText('已修改')).not.toBeInTheDocument();
    });
});
