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
        expect(screen.getByRole('group', { name: '檢視' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '編輯' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
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
        fireEvent.change(screen.getByLabelText('下架日期'), { target: { value: '2026-12-31' } });
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
        await open('half');
        await userEvent.click(screen.getByRole('button', { name: '指定日全部' }));
        fireEvent.change(screen.getByLabelText('下架日期'), { target: { value: '2026-10-01' } });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '儲存' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            '第 1 集的下架日期（1/10 四）必須遲於其上架日期（27/10 二），請修改下架設定。',
        );
        expect(putBody(fetchMock)).toBeUndefined();
        // 再改設定，錯誤提示收返
        await userEvent.click(screen.getByRole('button', { name: '不下架' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});

describe('ScheduleTab — icons', () => {
    it('should put an aria-hidden outline icon on 編輯 / 預覽 / 儲存 like the other buttons', async () => {
        api();
        await open('heart');
        for (const name of ['編輯', '預覽', '儲存']) {
            const icon = screen.getByRole('button', { name }).querySelector('svg.lucide');
            expect(icon).not.toBeNull();
            expect(icon).toHaveAttribute('aria-hidden', 'true');
        }
    });
});

describe('ScheduleTab — 預覽 (mockup ⑨)', () => {
    it('should show one merged timeline and the 上下架批次 table, read-only', async () => {
        api();
        await open('heart');
        await userEvent.click(screen.getByRole('button', { name: '每週 1 次' }));
        await userEvent.click(screen.getByRole('button', { name: '逢星期 X 下架 N 集' }));
        await userEvent.click(screen.getByRole('button', { name: '預覽' }));
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
    });
});
