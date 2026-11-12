import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
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
        // 已發佈：類型鎖住 → 實色 pill，唔出 disabled switch
        const kind = await screen.findByText('短篇集', { selector: '.pill' });
        expect(kind).toHaveClass('solid');
        expect(screen.queryByRole('group', { name: '類型' })).not.toBeInTheDocument();
        expect(screen.getByRole('group', { name: '由 R2 掃描' })).toHaveTextContent(
            '蘭茜夫人劇場/',
        );
        expect(screen.getByRole('textbox', { name: /^ID/ })).toHaveAttribute('readonly');
        // 檔名模板下面：用模板 + 第一集砌嘅例子
        expect(screen.getByText('例：01 - 戀愛二分一.m4a')).toHaveClass('muted');
    });

    it('should expand the arc from the hash with an inline name input and titles', async () => {
        api();
        renderAt('/dramas/lancy/arcs#half', '/dramas/:id/arcs', <DramaEditorPage tab="arcs" />);
        expect(await screen.findByRole('textbox', { name: /^名稱/ })).toHaveValue('戀愛二分一');
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
        await waitFor(() => expect(within(future).getByText(/5\/1/)).toBeInTheDocument());
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        const scheduleCall = () =>
            fetchMock.mock.calls.find(
                ([url, init]) =>
                    url === '/api/dramas/lancy/arcs/arc-01/schedule' && init?.method === 'PUT',
            );
        await waitFor(() => expect(scheduleCall()).toBeDefined());
        // 新短篇預設下架：排期同轉上架喺同一個 request（S-803：enable: true，server 同一個 batch 做）
        const [, init] = scheduleCall() ?? [];
        expect(JSON.parse(String(init?.body))).toEqual({
            rule: expect.any(Object) as unknown,
            enable: true,
        });
        expect(new Headers(init?.headers).get('if-match')).toBe('"v1"');
        await waitFor(() =>
            expect(
                fetchMock.mock.calls.filter(([url]) => url === '/api/entries/dramas/lancy'),
            ).toHaveLength(2),
        );
        expect(
            fetchMock.mock.calls.some(
                ([url, init]) => url === '/api/entries/dramas/lancy' && init?.method === 'PUT',
            ),
        ).toBe(false);
    });

    it('should show the error and not save twice when the schedule save fails (S-803)', async () => {
        const fetchMock = api({
            'PUT /api/dramas/lancy/arcs/arc-01/schedule': () => ({
                status: 412,
                body: { error: 'version mismatch' },
            }),
        });
        renderAt(
            '/dramas/lancy/schedule#arc-01',
            '/dramas/:id/schedule',
            <DramaEditorPage tab="schedule" />,
        );
        await userEvent.click(await screen.findByRole('button', { name: '逢一三五 · 每次 5 集' }));
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        await screen.findByRole('alert');
        const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
        expect(puts.map(([url]) => url)).toEqual(['/api/dramas/lancy/arcs/arc-01/schedule']);
    });

    it('should open and close an arc by clicking anywhere on its row', async () => {
        api();
        renderAt('/dramas/lancy/arcs', '/dramas/:id/arcs', <DramaEditorPage tab="arcs" />);
        await userEvent.click(await screen.findByText('3 集', { exact: false }));
        expect(screen.getByRole('textbox', { name: /^名稱/ })).toHaveValue('戀愛二分一');
        await userEvent.click(screen.getByRole('button', { name: '展開「戀愛二分一」' }));
        expect(screen.queryByRole('textbox', { name: /^名稱/ })).not.toBeInTheDocument();
    });

    it('should show Banner before 碟面 and 未排期 beside the 狀態 label', async () => {
        api();
        renderAt('/dramas/lancy/arcs#arc-01', '/dramas/:id/arcs', <DramaEditorPage tab="arcs" />);
        const slots = await screen.findAllByRole('button', { name: /^上載(Banner|碟面)$/ });
        expect(slots.map((slot) => slot.getAttribute('aria-label'))).toEqual([
            '上載Banner',
            '上載碟面',
        ]);
        const status = screen.getByRole('switch', { name: '狀態' });
        expect(status.closest('.field')?.querySelector('.label-line')).toHaveTextContent(
            '狀態未排期',
        );
        expect(screen.getByRole('textbox', { name: '簡介' })).toHaveAttribute(
            'placeholder',
            '選填',
        );
    });

    it('should mark an unconfirmed arc ID red and confirm it on save without changes', async () => {
        const fetchMock = api({
            'POST /api/todos/confirm-id': () => ({ body: { confirmed: 1 } }),
        });
        const row = {
            kind: 'newArc' as const,
            findingIds: [1],
            dramaId: 'lancy',
            arcId: 'arc-01',
            name: '蘭茜夫人劇場 · 我心不死',
            cells: {
                folder: { state: 'na' as const },
                id: { state: 'must' as const, target: '/dramas/lancy/arcs#arc-01' },
                images: { state: 'optional' as const, target: '/dramas/lancy/arcs#arc-01' },
                schedule: { state: 'must' as const, target: '/dramas/lancy/schedule#arc-01' },
                summary: { state: 'optional' as const, target: '/dramas/lancy/arcs#arc-01' },
            },
        };
        const data = fakeData({ todos: resource({ rows: [row], blocking: 1 }) });
        renderAt(
            '/dramas/lancy/arcs#arc-01',
            '/dramas/:id/arcs',
            <DramaEditorPage tab="arcs" />,
            data,
        );
        const id = await screen.findByRole('textbox', { name: /短篇 ID/ });
        expect(id.closest('.field')).toHaveClass('unconfirmed');
        expect(screen.queryByText('須設定 ID')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        await waitFor(() => expect(data.refresh).toHaveBeenCalled());
        const calls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
        expect(calls.map(([url, init]) => [url, JSON.parse(String(init?.body))])).toEqual([
            ['/api/todos/confirm-id', { dramaId: 'lancy', arcId: 'arc-01' }],
        ]);
        expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
    });

    it('should show discs: saved disc (or the black disc) in the title, arc discs in rows and tabs', async () => {
        api();
        const { unmount } = renderAt(
            '/dramas/lancy/arcs',
            '/dramas/:id/arcs',
            <DramaEditorPage tab="arcs" />,
        );
        const title = await screen.findByRole('heading', { level: 1 });
        expect(title.querySelector('.thumb.blank')).not.toBeNull();
        const rows = screen.getAllByRole('button', { name: /^展開「/ });
        rows.forEach((toggle) =>
            expect(toggle.closest('li')?.querySelector('.thumb.xs')).not.toBeNull(),
        );
        unmount();
        renderAt(
            '/dramas/lancy/schedule',
            '/dramas/:id/schedule',
            <DramaEditorPage tab="schedule" />,
        );
        const tab = await screen.findByRole('tab', { name: /我心不死/ });
        expect(tab.querySelector('.thumb.xs')).not.toBeNull();
    });

    describe('changing the ID of an arc that has a schedule (S-804)', () => {
        const SCHEDULE = {
            rule: {
                kind: 'periodic',
                start: '2099-01-05',
                perRelease: 5,
                every: { weekdays: [1] },
            },
            expanded: null,
            updatedAt: 's1',
        };

        /** 改短篇 ID（離開欄位 = 套用）再撳儲存 */
        const renameArc = async (to: string) => {
            const id = await screen.findByRole('textbox', { name: /短篇 ID/ });
            await userEvent.clear(id);
            await userEvent.type(id, `${to}{Enter}`);
            await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        };

        it('should save and read the schedule under the new ID when the server moves it', async () => {
            let saved = DRAMA;
            const fetchMock = api({
                'GET /api/entries/dramas/lancy': () => ({
                    body: saved,
                    etag: `"${saved.updatedAt}"`,
                }),
                'GET /api/dramas/lancy/arcs/arc-01/schedule': () => ({ body: SCHEDULE }),
                'GET /api/dramas/lancy/arcs/lancy-02/schedule': () => ({ body: SCHEDULE }),
                'PUT /api/entries/dramas/lancy': (init: RequestInit) => {
                    const body = JSON.parse(String(init.body)) as Pick<
                        typeof DRAMA,
                        'definition' | 'images'
                    >;
                    saved = { ...DRAMA, ...body, updatedAt: 'v2' };
                    return {
                        body: {
                            updatedAt: 'v2',
                            draft: false,
                            warnings: { missingEpisodeIds: [] },
                        },
                    };
                },
            });
            const { unmount } = renderAt(
                '/dramas/lancy/arcs#arc-01',
                '/dramas/:id/arcs',
                <DramaEditorPage tab="arcs" />,
            );
            await renameArc('lancy-02');
            await waitFor(() => expect(saved.updatedAt).toBe('v2'));
            const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
            const body = JSON.parse(String(put?.[1]?.body)) as {
                definition: { arcs: { id: string }[] };
            };
            expect(body.definition.arcs.map((arc) => arc.id)).toEqual(['half', 'lancy-02']);
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            unmount();
            // 排程 tab：短篇用新 ID 讀返 server 搬咗過去嘅排程
            renderAt(
                '/dramas/lancy/schedule#lancy-02',
                '/dramas/:id/schedule',
                <DramaEditorPage tab="schedule" />,
            );
            const tab = await screen.findByRole('tab', { name: /我心不死/ });
            expect(tab).toHaveAttribute('aria-selected', 'true');
            expect(
                fetchMock.mock.calls.some(
                    ([url]) => url === '/api/dramas/lancy/arcs/lancy-02/schedule',
                ),
            ).toBe(true);
        });

        it('should explain a 409 from the server and keep the edit unsaved', async () => {
            api({
                'GET /api/dramas/lancy/arcs/arc-01/schedule': () => ({ body: SCHEDULE }),
                'PUT /api/entries/dramas/lancy': () => ({
                    status: 409,
                    body: {
                        error: 'arc arc-01 has a schedule; remove it first',
                        arcId: 'arc-01',
                        reason: 'arcScheduled',
                    },
                }),
            });
            renderAt(
                '/dramas/lancy/arcs#arc-01',
                '/dramas/:id/arcs',
                <DramaEditorPage tab="arcs" />,
            );
            await renameArc('lancy-02');
            expect(
                await screen.findByText('此短篇已有排程，請先移除排程再修改 ID。'),
            ).toHaveAttribute('role', 'alert');
            expect(screen.getByRole('textbox', { name: /短篇 ID/ })).toHaveValue('lancy-02');
        });
    });

    it('should show the saved disc image in the title when the drama has one (S-824)', async () => {
        api({
            'GET /api/entries/dramas/lancy': () => ({
                body: {
                    ...DRAMA,
                    definition: { ...DRAMA.definition, disc: 'disc.webp' },
                    images: { 'disc.webp': 'aaa.webp' },
                },
                etag: '"v1"',
            }),
        });
        renderAt('/dramas/lancy', '/dramas/:id', <DramaEditorPage tab="basic" />);
        const title = await screen.findByRole('heading', { level: 1 });
        const disc = title.querySelector<HTMLElement>('.thumb');
        expect(disc).not.toHaveClass('blank');
        expect(disc?.style.backgroundImage).toBe('url("/catalog/v1/img/aaa.webp")');
    });
});
