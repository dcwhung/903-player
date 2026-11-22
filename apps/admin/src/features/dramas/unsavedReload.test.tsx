/*
 * 「刪除排程」同「配對資料夾」之後會重讀劇集（AU-022）：有未儲存嘅改動就唔畀做（草稿會冇咗），
 * 刪除排程要先確認，刪完同儲存一樣刷新共用資料（待辦 / nav 數字）
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fakeData, mockApi, resource } from '../../../tests/renderApp';
import type { TodoRow } from '../../api/types';
import { AdminDataContext, type AdminData } from '../../data/AdminData';
import { ToastProvider } from '../../ui/Toast';
import { DramaEditorPage } from './DramaEditor';

const DRAMA = {
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        addedAt: '2026-10-27',
        audio: { host: 'r2', folder: '蘭茜夫人劇場', file: '{no2}.m4a' },
        arcs: [{ id: 'half', name: '戀愛二分一', episodes: 3 }],
    },
    images: {},
    draft: false,
    updatedAt: 'v1',
};

const SCHEDULE = {
    rule: { kind: 'dates', batches: [{ from: 1, date: '2026-10-27' }] },
    expanded: null,
    updatedAt: 's1',
};

const api = () =>
    mockApi({
        'GET /api/entries/dramas/lancy': () => ({ body: DRAMA, etag: '"v1"' }),
        'GET /api/dramas/lancy/arcs/half/schedule': () => ({ body: SCHEDULE }),
        'DELETE /api/dramas/lancy/arcs/half/schedule': () => ({ body: {} }),
        'GET /api/folders/unmapped': () => ({ body: { folders: ['蘭茜夫人'] } }),
        'POST /api/dramas/lancy/folder': () => ({ body: { updatedAt: 'v2', findings: [] } }),
    });

const callsOf = (fetchMock: ReturnType<typeof api>, method: string) =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === method);

const renderEditor = (url: string, data: AdminData = fakeData()) => {
    render(
        <AdminDataContext.Provider value={data}>
            <ToastProvider>
                <MemoryRouter initialEntries={[url]}>
                    <Routes>
                        <Route path="/dramas/:id" element={<DramaEditorPage tab="basic" />} />
                        <Route
                            path="/dramas/:id/schedule"
                            element={<DramaEditorPage tab="schedule" />}
                        />
                    </Routes>
                </MemoryRouter>
            </ToastProvider>
        </AdminDataContext.Provider>,
    );
    return data;
};

const editSummary = async () =>
    userEvent.type(await screen.findByRole('textbox', { name: /^簡介/ }), '未儲存');

const deleteButton = () => screen.findByRole('button', { name: '刪除排程' });

describe('刪除排程 (AU-022)', () => {
    it('should ask for confirmation before deleting and not delete on 取消', async () => {
        const fetchMock = api();
        renderEditor('/dramas/lancy/schedule');
        await userEvent.click(await deleteButton());

        const dialog = screen.getByRole('dialog', { name: '刪除排程？' });
        expect(callsOf(fetchMock, 'DELETE')).toHaveLength(0);
        await userEvent.click(within(dialog).getByRole('button', { name: '取消' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(callsOf(fetchMock, 'DELETE')).toHaveLength(0);
    });

    it('should delete after confirming and refresh the shared admin data', async () => {
        const fetchMock = api();
        const data = renderEditor('/dramas/lancy/schedule');
        await userEvent.click(await deleteButton());
        const dialog = screen.getByRole('dialog', { name: '刪除排程？' });
        await userEvent.click(within(dialog).getByRole('button', { name: '刪除' }));

        await waitFor(() => expect(callsOf(fetchMock, 'DELETE')).toHaveLength(1));
        await waitFor(() => expect(data.refresh).toHaveBeenCalledTimes(1));
    });

    it('should be disabled, with the reason, while another tab has unsaved changes', async () => {
        api();
        renderEditor('/dramas/lancy');
        await editSummary();
        await userEvent.click(screen.getByRole('link', { name: '排程' }));

        expect(await deleteButton()).toBeDisabled();
        expect(
            screen.getByText('其他分頁有未儲存的變更，請先儲存，然後才可儲存或刪除排程。'),
        ).toBeInTheDocument();
    });
});

describe('配對資料夾 (AU-022)', () => {
    const NA = { state: 'na' } as const;
    const missing: TodoRow = {
        key: 'missingFolder/lancy',
        publish: 'always',
        kind: 'missingFolder',
        findingIds: [1],
        dramaId: 'lancy',
        arcId: null,
        name: '蘭茜夫人劇場',
        cells: {
            folder: { state: 'must', target: '/dramas/lancy#folder' },
            id: NA,
            images: NA,
            schedule: NA,
            summary: NA,
        },
    };
    const withMissingFolder = () => fakeData({ todos: resource({ rows: [missing], blocking: 1 }) });

    const pickFolder = async () => {
        await screen.findByRole('option', { name: '蘭茜夫人/' });
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: '選擇未配對的資料夾…' }),
            '蘭茜夫人',
        );
        return screen.getByRole('button', { name: '配對' });
    };

    it('should pair when there are no unsaved changes', async () => {
        const fetchMock = api();
        renderEditor('/dramas/lancy', withMissingFolder());
        await userEvent.click(await pickFolder());

        await waitFor(() => expect(callsOf(fetchMock, 'POST')).toHaveLength(1));
    });

    it('should be disabled, with the reason, while the draft has unsaved changes', async () => {
        const fetchMock = api();
        renderEditor('/dramas/lancy', withMissingFolder());
        await editSummary();

        expect(await pickFolder()).toBeDisabled();
        expect(
            screen.getByText('有未儲存的變更，請先儲存，然後才可配對資料夾。'),
        ).toBeInTheDocument();
        expect(callsOf(fetchMock, 'POST')).toHaveLength(0);
    });
});
