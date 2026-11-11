import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderAt } from '../../../tests/renderApp';
import { DramaEditorPage } from './DramaEditor';

const DRAMA = {
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        addedAt: '2026-10-27',
        audio: { host: 'r2', folder: '蘭茜夫人劇場', file: '{no2} - {arc}.m4a' },
        arcs: [
            { id: 'half', name: '戀愛二分一', episodes: 3, titles: { 3: '初次見面' } },
            { id: 'arc-01', name: '我心不死', episodes: 10, enabled: false },
        ],
    },
    images: {},
    draft: false,
    updatedAt: 'v1',
};

const api = (extra = {}) =>
    mockApi({
        'GET /api/entries/dramas/lancy': () => ({ body: DRAMA, etag: '"v1"' }),
        'GET /api/dramas/lancy/arcs/half/schedule': () => ({
            status: 404,
            body: { error: 'no such schedule' },
        }),
        'GET /api/dramas/lancy/arcs/arc-01/schedule': () => ({
            status: 404,
            body: { error: 'no such schedule' },
        }),
        'POST /api/dramas/lancy/arcs/arc-01/schedule/preview': () => ({
            body: {
                expanded: {
                    addedAt: '2099-01-05',
                    episodeDates: { 6: '2099-01-07' },
                    episodeRemovedAt: {},
                },
                warnings: { missingEpisodeIds: [] },
            },
        }),
        ...extra,
    });

describe('DramaEditor', () => {
    it('should show the basic tab with the R2 scan box', async () => {
        api();
        renderAt('/dramas/lancy', '/dramas/:id', <DramaEditorPage tab="basic" />);
        expect(await screen.findByRole('group', { name: '類型' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: '由 R2 掃描' })).toHaveTextContent(
            '蘭茜夫人劇場/',
        );
        expect(screen.getByRole('textbox', { name: /^ID/ })).toHaveAttribute('readonly');
    });

    it('should expand the arc from the hash with an inline name input and titles', async () => {
        api();
        renderAt('/dramas/lancy/arcs#half', '/dramas/:id/arcs', <DramaEditorPage tab="arcs" />);
        expect(await screen.findByRole('textbox', { name: '短篇名稱（播放器顯示）' })).toHaveValue(
            '戀愛二分一',
        );
        expect(screen.getByRole('textbox', { name: '各集標題' })).toHaveValue(
            '第 1 集 ｜ \n第 2 集 ｜ \n第 3 集 ｜ 初次見面',
        );
        await userEvent.click(screen.getByRole('button', { name: '展開「我心不死」' }));
        expect(screen.getByRole('textbox', { name: /短篇 ID/ })).not.toHaveAttribute('readonly');
    });

    it('should preview a preset schedule and save it for the selected arc', async () => {
        const fetchMock = api({
            'PUT /api/dramas/lancy/arcs/arc-01/schedule': () => ({
                body: { updatedAt: 'v2', warnings: { missingEpisodeIds: [] } },
            }),
            'PUT /api/entries/dramas/lancy': () => ({
                body: { updatedAt: 'v3', draft: false, warnings: { missingEpisodeIds: [] } },
            }),
        });
        renderAt(
            '/dramas/lancy/schedule#arc-01',
            '/dramas/:id/schedule',
            <DramaEditorPage tab="schedule" />,
        );
        const tab = await screen.findByRole('tab', { name: /我心不死/ });
        expect(tab).toHaveAttribute('aria-selected', 'true');
        await userEvent.click(screen.getByRole('button', { name: '逢一三五 · 每次 5 集' }));
        const future = await screen.findByRole('group', { name: '今天之後的批次' });
        await waitFor(() => expect(within(future).getByText(/1\/5/)).toBeInTheDocument());
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        await waitFor(() =>
            expect(
                fetchMock.mock.calls.some(
                    ([url, init]) =>
                        url === '/api/dramas/lancy/arcs/arc-01/schedule' && init?.method === 'PUT',
                ),
            ).toBe(true),
        );
        // 新短篇預設下架：排期之後順手轉上架
        await waitFor(() =>
            expect(
                fetchMock.mock.calls.some(
                    ([url, init]) => url === '/api/entries/dramas/lancy' && init?.method === 'PUT',
                ),
            ).toBe(true),
        );
    });
});
