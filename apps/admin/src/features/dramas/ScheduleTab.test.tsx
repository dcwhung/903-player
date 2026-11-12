import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, renderAt } from '../../../tests/renderApp';
import { DramaEditorPage } from './DramaEditor';

/** 今日 = 1/12（mockup ⑧ ⑨） */
const NOW = new Date('2026-12-01T04:00:00Z');

const DRAMA = {
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        addedAt: '2026-10-27',
        audio: { host: 'r2', folder: '蘭茜夫人劇場', file: '{no2} - {arc}.m4a' },
        arcs: [
            // 全部 30 集 27/10 已上架
            { id: 'half', name: '戀愛二分一', episodes: 30 },
            // 第 1–15 集已上架（26/10、2/11、9/11），第 16 集起 7/12 先上架
            {
                id: 'heart',
                name: '我心不死',
                episodes: 30,
                addedAt: '2026-10-26',
                episodeDates: { 6: '2026-11-02', 11: '2026-11-09', 16: '2026-12-07' },
            },
        ],
    },
    images: {},
    draft: false,
    updatedAt: 'v1',
};

const NO_SCHEDULE = () => ({ status: 404, body: { error: 'no such schedule' } });

const api = (extra = {}) =>
    mockApi({
        'GET /api/entries/dramas/lancy': () => ({ body: DRAMA, etag: '"v1"' }),
        'GET /api/dramas/lancy/arcs/half/schedule': NO_SCHEDULE,
        'GET /api/dramas/lancy/arcs/heart/schedule': NO_SCHEDULE,
        'PUT /api/dramas/lancy/arcs/half/schedule': () => ({
            body: { updatedAt: 'v2', warnings: { missingEpisodeIds: [] } },
        }),
        ...extra,
    });

const open = async (arcId: string) => {
    renderAt(
        `/dramas/lancy/schedule#${arcId}`,
        '/dramas/:id/schedule',
        <DramaEditorPage tab="schedule" />,
    );
    return screen.findByRole('heading', { name: '下架' });
};

const putBody = (fetchMock: ReturnType<typeof api>) => {
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    return call ? (JSON.parse(String(call[1]?.body)) as { rule: unknown }) : undefined;
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('ScheduleTab — 編輯 (mockup ⑧)', () => {
    it('should show the 上架 and 下架 panels with what each can schedule', async () => {
        api();
        await open('heart');
        expect(screen.getByRole('tablist', { name: '檢視' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '編輯' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', { name: '上架' })).toBeInTheDocument();
        expect(screen.getByText('可上架：第 16–30 集（共 15 集）')).toBeInTheDocument();
        expect(
            screen.getByText('可下架：第 1–15 集（已上架）· 第 16–30 集（已排程上架）'),
        ).toBeInTheDocument();
        const presets = screen.getByRole('group', { name: '快速套用' });
        expect(
            within(presets)
                .getAllByRole('button')
                .map((b) => b.textContent),
        ).toEqual(['一次性全部', '每日 1 集', '每週 1 次']);
        await userEvent.click(within(presets).getByRole('button', { name: '每週 1 次' }));
        expect(screen.getByText(/每次上架/)).toBeInTheDocument();
        // 已上架嘅集數：一格灰色 ✓，唔改得
        expect(screen.getByText('✓ 已上架')).toBeInTheDocument();
        const modes = screen.getByRole('group', { name: '下架方式' });
        expect(
            within(modes)
                .getAllByRole('button')
                .map((b) => b.textContent),
        ).toEqual(['不下架', '指定日全部', '上架 N 日後', '逢星期 X 下架 N 集']);
        await userEvent.click(within(modes).getByRole('button', { name: '逢星期 X 下架 N 集' }));
        expect(screen.getByText(/每次下架/)).toBeInTheDocument();
        // 舊「上架 90 日後下架」dropdown 已經由下架 panel 取代
        expect(screen.queryByRole('combobox', { name: '下架安排' })).not.toBeInTheDocument();
    });

    it('should only allow unlisting when every episode is listed and save it with the listed batch', async () => {
        const fetchMock = api();
        await open('half');
        expect(screen.getByText('✓ 已全部上架（27/10 二 · 第 1–30 集）')).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: '快速套用' })).not.toBeInTheDocument();
        expect(screen.queryByText(/每次上架/)).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '指定日全部' }));
        await userEvent.clear(screen.getByLabelText('下架日期'));
        await userEvent.type(screen.getByLabelText('下架日期'), '31/12/2026');
        expect(screen.getByText(/全部下架/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        await waitFor(() => expect(putBody(fetchMock)).toBeDefined());
        expect(putBody(fetchMock)?.rule).toEqual({
            kind: 'dates',
            batches: [{ from: 1, date: '2026-10-27' }],
            unlist: { kind: 'date', date: '2026-12-31' },
        });
    });

    it('should pop the error only on 儲存 when an unlist date is not after the listing date', async () => {
        const fetchMock = api();
        // 一次性全部預設今日 1/12 上架；下架日最早都係今日 → 同日 = 衝突
        await open('heart');
        await userEvent.click(screen.getByRole('button', { name: '指定日全部' }));
        await userEvent.clear(screen.getByLabelText('下架日期'));
        await userEvent.type(screen.getByLabelText('下架日期'), '01/12/2026');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            '第 16 集的下架日期（1/12 二）必須遲於其上架日期（1/12 二），請修改下架設定。',
        );
        expect(putBody(fetchMock)).toBeUndefined();
        // 再改設定，錯誤提示收返
        await userEvent.click(screen.getByRole('button', { name: '不下架' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});

describe('ScheduleTab — icons', () => {
    it('should put an aria-hidden outline icon on 編輯 / 預覽 / 復原 / 刪除 / 儲存', async () => {
        api({
            'GET /api/dramas/lancy/arcs/half/schedule': () => ({
                body: {
                    rule: { kind: 'dates', batches: [{ from: 1, date: '2026-10-27' }] },
                    expanded: null,
                    updatedAt: 's1',
                },
            }),
        });
        await open('half');
        // 改一改先出「復原」
        await userEvent.click(screen.getByRole('button', { name: '指定日全部' }));
        // 刪除：掣面「刪除」，讀屏名「刪除排程」（main 0.6.3 做法）
        for (const [role, name] of [
            ['tab', '編輯'],
            ['tab', '預覽'],
            ['button', '復原'],
            ['button', '刪除排程'],
            ['button', '儲存'],
        ] as const) {
            const icon = screen.getByRole(role, { name }).querySelector('svg.lucide');
            expect(icon).not.toBeNull();
            expect(icon).toHaveAttribute('aria-hidden', 'true');
        }
        expect(screen.getByRole('button', { name: '刪除排程' })).toHaveTextContent(/^刪除$/);
    });
});

describe('ScheduleTab — 下架方式 chips', () => {
    it('should show the unlist modes as 快速套用 chips like the listing panel, no segmented box', async () => {
        api();
        await open('heart');
        const panel = screen.getByRole('heading', { name: '下架' }).closest('section');
        const modes = within(panel as HTMLElement).getByRole('group', { name: '下架方式' });
        expect(modes).toHaveClass('presets');
        expect(modes).not.toHaveClass('seg');
        expect(within(modes).getByText('快速套用：')).toBeInTheDocument();
        expect(within(modes).getByRole('button', { name: '不下架' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });
});

describe('ScheduleTab — 預覽 (mockup ⑨)', () => {
    it('should show one merged timeline and the 上下架批次 table, read-only', async () => {
        api();
        await open('heart');
        await userEvent.click(screen.getByRole('button', { name: '每週 1 次' }));
        await userEvent.click(screen.getByRole('button', { name: '逢星期 X 下架 N 集' }));
        await userEvent.click(screen.getByRole('tab', { name: '預覽' }));
        expect(screen.queryByRole('heading', { name: '上架' })).not.toBeInTheDocument();
        const table = screen.getByRole('table');
        expect(
            within(table)
                .getAllByRole('columnheader')
                .map((th) => th.textContent),
        ).toEqual(['日期', '上架', '下架']);
        // 每週 1 次（逢二）由今日 1/12 起，每次 1 集 → 第 16 集 1/12 上架
        expect(within(table).getByText('第 16 集')).toHaveClass('pill');
        const cell = screen.getAllByRole('img', { name: /^第 16 集：1\/12 上架/ })[0];
        expect(cell).toBeDefined();
        await userEvent.hover(cell as HTMLElement);
        expect(document.querySelector('.tip-pop')?.textContent).toMatch(/^第 16 集：1\/12 上架，/);
        // 今日（1/12）係上架日：唔加格，嗰格 / 嗰行加「（今日）」
        const timeline = screen.getByRole('group', { name: '上下架時間軸' });
        expect(within(timeline).getByText('1/12（今日）')).toBeInTheDocument();
        expect(within(timeline).queryByText('今日')).not.toBeInTheDocument();
        expect(within(table).getByText('1/12 二（今日）').closest('tr')).toHaveClass('today');
    });
});

describe('ScheduleTab — 編輯｜預覽 tabs (用戶 2026-11-12)', () => {
    it('should be a tablist with the panel it controls, switched by arrow keys', async () => {
        api();
        await open('heart');
        const edit = screen.getByRole('tab', { name: '編輯' });
        const preview = screen.getByRole('tab', { name: '預覽' });
        expect(preview).toHaveAttribute('aria-selected', 'false');
        // 同 player 主頁 tabs 一樣：膠囊軌道 + 一粒共用嘅揀中膠囊（墊喺揀中嗰個 tab 底）
        const pill = screen.getByRole('tablist', { name: '檢視' }).querySelector('.view-pill');
        expect(pill).toHaveAttribute('aria-hidden', 'true');
        expect(pill).toHaveAttribute('data-view', 'edit');
        const panel = document.getElementById(edit.getAttribute('aria-controls') ?? '');
        expect(panel).toHaveAttribute('role', 'tabpanel');
        expect(panel).toContainElement(screen.getByRole('heading', { name: '上架' }));
        edit.focus();
        fireEvent.keyDown(edit, { key: 'ArrowRight' });
        expect(preview).toHaveAttribute('aria-selected', 'true');
        expect(preview).toHaveFocus();
        expect(pill).toHaveAttribute('data-view', 'preview');
        expect(screen.queryByRole('heading', { name: '上架' })).not.toBeInTheDocument();
        fireEvent.keyDown(preview, { key: 'ArrowLeft' });
        expect(edit).toHaveAttribute('aria-selected', 'true');
    });
});

describe('ScheduleTab — layout feedback (用戶 2026-11-12)', () => {
    it('should put 快速套用： on its own line above the chips in both panels', async () => {
        api();
        await open('heart');
        for (const name of ['快速套用', '下架方式']) {
            const label = within(screen.getByRole('group', { name })).getByText('快速套用：');
            expect(label).toHaveClass('presets-label');
        }
    });

    it('should split the cadence sentence so a second line starts with 逢', async () => {
        api();
        await open('heart');
        await userEvent.click(screen.getByRole('button', { name: '每週 1 次' }));
        const parts = document.querySelectorAll('.panel.up .sentence.cadence > .cadence-part');
        expect([...parts].map((part) => part.textContent?.slice(0, 1))).toEqual(['由', '逢']);
        expect(parts[0]?.textContent).toMatch(/起，$/);
        expect(parts[1]?.textContent).toMatch(/集$/);
    });

    it('should mark 今日 on both strips: on the batch of today, else as its own cell', async () => {
        api();
        await open('heart');
        await userEvent.click(screen.getByRole('button', { name: '指定日全部' }));
        // 一次性全部預設今日（1/12）上架：撞日 → 嗰格加「（今日）」，唔另加一格
        const listing = within(screen.getByRole('group', { name: '上架時間軸' }));
        expect(listing.queryByText('今日')).not.toBeInTheDocument();
        expect(listing.getByText('1/12 二（今日）').closest('.seg-batch')).toHaveClass('today');
        // 下架日喺之後：今日插一格喺最前
        const unlist = within(screen.getByRole('group', { name: '下架時間軸' }));
        const cell = unlist.getByText('今日').closest('.seg-batch');
        expect(cell).toHaveClass('today');
        expect(within(cell as HTMLElement).getByText('1/12 二')).toBeInTheDocument();
    });
});

describe('ScheduleTab — summary while unsaved (用戶 2026-11-12)', () => {
    it('should say 即將排程上架（未儲存） until the rule is saved', async () => {
        api();
        await open('heart');
        expect(
            screen.getByText('第 1–15 集已上架 · 第 16–30 集即將排程上架（未儲存）'),
        ).toBeInTheDocument();
        expect(screen.queryByText(/已排程上架$/)).not.toBeInTheDocument();
    });

    it('should use the saved wording once saved, and the draft wording again after a change', async () => {
        api({
            'GET /api/dramas/lancy/arcs/heart/schedule': () => ({
                body: {
                    rule: {
                        kind: 'dates',
                        batches: [
                            { from: 1, date: '2026-10-26' },
                            { from: 6, date: '2026-11-02' },
                            { from: 11, date: '2026-11-09' },
                            { from: 16, date: '2026-12-07' },
                        ],
                        unlist: { kind: 'date', date: '2026-12-31' },
                    },
                    expanded: null,
                    updatedAt: 's1',
                },
            }),
        });
        await open('heart');
        // 只講上架（用戶 2026-11-12 第三輪：冇下架部分）
        expect(screen.getByText('第 1–15 集已上架 · 第 16–30 集已排程上架')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '上架 N 日後' }));
        expect(
            screen.getByText('第 1–15 集已上架 · 第 16–30 集即將排程上架（未儲存）'),
        ).toBeInTheDocument();
        expect(screen.queryByText(/排程下架/)).not.toBeInTheDocument();
    });
});

describe('ScheduleTab — earliest date is today (用戶 2026-11-12)', () => {
    it('should refuse listing and unlisting dates before today, with the inline error', async () => {
        api();
        await open('half');
        await userEvent.click(screen.getByRole('button', { name: '指定日全部' }));
        const unlist = screen.getByLabelText('下架日期');
        await userEvent.clear(unlist);
        await userEvent.type(unlist, '30/11/2026{Enter}');
        expect(unlist).toHaveAccessibleDescription('日期不可早於 01/12/2026');
        await userEvent.clear(unlist);
        await userEvent.type(unlist, '02/12/2026');
        await userEvent.click(screen.getByRole('button', { name: '選擇下架日期' }));
        await userEvent.keyboard('{PageUp}');
        expect(screen.getByRole('button', { name: '30/11/2026 星期一' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    it('should not let the listing start go before today even when the last batch is older', async () => {
        api();
        await open('heart');
        const start = screen.getByLabelText('上架日期');
        await userEvent.clear(start);
        await userEvent.type(start, '20/11/2026{Enter}');
        expect(start).toHaveAccessibleDescription('日期不可早於 01/12/2026');
    });
});
