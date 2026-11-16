import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import { ValidationError } from '../../api/client';
import { getChanges, publish } from '../../api/publishEndpoints';
import type { ChangeItem } from '@903-player/catalog';
import type {
    ChangesResponse,
    LoadedEntry,
    PublishSummary,
    PublishWarning,
    TodoRow,
} from '../../api/types';
import { PublishPage } from './PublishPage';

vi.mock('../../api/publishEndpoints', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/publishEndpoints')>()),
    getChanges: vi.fn(),
    publish: vi.fn(),
}));

const WARNINGS: PublishWarning[] = [
    { kind: 'neutralTheme', target: 'dramas/fresh' },
    {
        kind: 'contrast',
        target: 'dramas/lancy',
        foreground: 'muted',
        background: 'surface',
        ratio: 3.9,
        minimum: 4.5,
    },
];

/** api catalog/publish.ts resolveImages 嘅真實錯誤格式 */
const BANNER_ERROR = 'banner: image long → 0123456789abcdef.webp not uploaded';

const changesOf = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    warnings: [],
    bannerChanged: false,
    ...over,
});

/** 冇 URL selection：預設選擇（GET /api/changes?selection= 都回同一份） */
const show = (changes: ChangesResponse) => {
    vi.mocked(getChanges).mockResolvedValue(changes);
    return renderAt(
        '/publish',
        '/publish',
        <PublishPage />,
        fakeData({ changes: resource(changes) }),
    );
};

/** getChanges resolve 完、發佈掣唔再因為 loading 而灰 */
const waitForLoaded = () =>
    waitFor(() => expect(screen.queryByText('載入中…')).not.toBeInTheDocument());

describe('PublishPage', () => {
    it('should fold warnings into one summary line that still lets you publish', async () => {
        show(changesOf({ warnings: WARNINGS, bannerChanged: true }));
        expect(await screen.findByText('2 項配色警告（不影響發佈）')).toBeInTheDocument();
        await waitForLoaded();
        expect(screen.queryByRole('list', { name: '配色警告' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled();
        await userEvent.click(screen.getByRole('button', { name: '展開' }));
        const list = screen.getByRole('list', { name: '配色警告' });
        expect(within(list).getByText(/fresh：未設定配色，現正使用中性灰/)).toBeInTheDocument();
        expect(within(list).getByRole('link', { name: '前往選擇' })).toHaveAttribute(
            'href',
            '/dramas/fresh/theme',
        );
        expect(within(list).getByRole('link', { name: '前往修改' })).toBeInTheDocument();
    });

    it('should expand every warning next to a validation error', async () => {
        show(
            changesOf({
                warnings: WARNINGS,
                validation: { ok: false, error: BANNER_ERROR },
                changes: { items: [], timeline: [] },
            }),
        );
        expect(await screen.findByRole('list', { name: '配色警告' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '展開' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
    });

    it('should explain a banner validation error in Chinese with a link to the Banner page', async () => {
        show(changesOf({ validation: { ok: false, error: BANNER_ERROR }, warnings: [] }));
        const errors = await screen.findByRole('list', { name: '錯誤' });
        expect(errors).toHaveTextContent('首頁 Banner 不完整：缺少闊版（2000 × 400）');
        expect(errors).toHaveTextContent('請重新更換 Banner，或還原預設');
        expect(within(errors).getByRole('link', { name: '前往 App 外觀' })).toHaveAttribute(
            'href',
            '/appearance',
        );
        expect(screen.queryByText(BANNER_ERROR)).not.toBeInTheDocument();
    });

    it('should fall back to the original text for an error it cannot explain', async () => {
        const error = 'dramas/lancy: image tile.webp → 0123456789abcdef.webp not uploaded';
        show(changesOf({ validation: { ok: false, error } }));
        const errors = await screen.findByRole('list', { name: '錯誤' });
        expect(errors).toHaveTextContent(error);
        expect(within(errors).queryByRole('link')).not.toBeInTheDocument();
    });

    it('should link an unexplained banner error to the Banner page with the original text', async () => {
        const error = 'catalog.json: banner has an unknown key "wide"';
        show(changesOf({ validation: { ok: false, error } }));
        const errors = await screen.findByRole('list', { name: '錯誤' });
        expect(errors).toHaveTextContent(error);
        expect(within(errors).getByRole('link', { name: '前往 App 外觀' })).toBeInTheDocument();
    });

    it('should count a banner-only change as something to publish', async () => {
        show(changesOf({ bannerChanged: true }));
        await waitForLoaded();
        expect(screen.getByText('本次只更改首頁 Banner。')).toBeInTheDocument();
        // 數字下面嗰行 pill 已拎走（mockup 方案 1）
        expect(screen.queryByText('首頁 Banner 已更改')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled();
    });

    it('should keep 發佈 disabled when nothing changed', async () => {
        show(changesOf());
        await waitForLoaded();
        expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
    });

    it('should show 返回 with 返回待辦 as its accessible name', async () => {
        show(changesOf());
        await waitForLoaded();
        const back = screen.getByRole('link', { name: '返回待辦' });
        expect(back).toHaveTextContent(/^返回$/);
        expect(back).toHaveAttribute('aria-label', '返回待辦');
        expect(back).toHaveAttribute('href', '/');
    });

    describe('selective publish', () => {
        const NA = { state: 'na' } as const;
        const DONE = { state: 'done' } as const;
        const ROWS: TodoRow[] = [
            {
                key: 'newArc/lancy/love-after',
                publish: 'selectable',
                kind: 'newArc',
                findingIds: [1],
                dramaId: 'lancy',
                arcId: 'love-after',
                name: '蘭茜夫人劇場 · 戀愛後二分一',
                cells: { folder: DONE, id: DONE, images: DONE, schedule: DONE, summary: NA },
            },
            {
                key: 'newArc/sammy/camp',
                publish: 'incomplete',
                kind: 'newArc',
                findingIds: [2],
                dramaId: 'sammy',
                arcId: 'camp',
                name: '森美小儀系列 · 大衛營',
                cells: {
                    folder: DONE,
                    id: DONE,
                    images: DONE,
                    schedule: { state: 'must', target: '/dramas/sammy/schedule#camp' },
                    summary: NA,
                },
            },
        ];
        const SELECTION = {
            content: ['newArc/lancy/love-after'],
            branding: { icon: false, text: true },
            banner: false,
        };
        const EDIT = {
            kind: 'edit',
            when: 'now',
            entry: { kind: 'shows', id: 'waves', name: '口水多過浪花' },
            detail: {},
        } as unknown as ChangeItem;
        const SELECTED = changesOf({
            changes: { items: [EDIT], timeline: [] },
            brandingChanged: true,
            appearance: { icon: false, text: true, banner: false },
            others: { items: [EDIT], timeline: [] },
            selection: { content: SELECTION.content, skipped: [] },
        });
        const LANCY: LoadedEntry = {
            kind: 'dramas',
            id: 'lancy',
            definition: { name: '蘭茜夫人劇場', arcs: [{ id: 'love-after', episodes: 20 }] },
            images: {},
            draft: false,
            updatedAt: 'v1',
            etag: '"v1"',
        };
        const data = () =>
            fakeData({
                todos: resource({ rows: ROWS, blocking: 1 }),
                entries: resource([LANCY]),
                changes: resource(changesOf({ appearance: SELECTED.appearance })),
            });
        const open = (over: Partial<ChangesResponse> = {}) => {
            vi.mocked(getChanges).mockResolvedValue({ ...SELECTED, ...over });
            return renderAt(
                `/publish?${new URLSearchParams({ selection: JSON.stringify(SELECTION) }).toString()}`,
                '/publish',
                <PublishPage />,
                data(),
            );
        };

        it('should list other saved changes in the timeline with field chips', async () => {
            const lancyEdit = {
                kind: 'edit',
                when: 'now',
                entry: { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' },
                detail: { fields: ['theme', 'arcs.love-after.summary'] },
            } as unknown as ChangeItem;
            const changes = { items: [lancyEdit], timeline: [{ when: 'now', items: [lancyEdit] }] };
            open({ changes, others: changes });
            const timeline = await screen.findByRole('region', { name: '上線時間' });
            // 短篇冇 name：用 key（love-after）
            expect(within(timeline).getByText('配色')).toHaveClass('tl-chip');
            expect(within(timeline).getByText('love-after：簡介')).toHaveClass('tl-chip');
        });

        it('should drop 本次發佈 and the pills: stats → timeline (App 外觀 note, skip group last)', async () => {
            const NEW_ARC = {
                kind: 'newArc',
                when: 'now',
                entry: { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' },
                arc: { id: 'love-after', name: '戀愛後二分一', label: '戀愛後二分一' },
                detail: { episodes: { first: 1, last: 20 } },
            } as unknown as ChangeItem;
            const items = [NEW_ARC, EDIT];
            open({ changes: { items, timeline: [{ when: 'now', items }] } });
            const timeline = await screen.findByRole('region', { name: '上線時間' });
            expect(getChanges).toHaveBeenLastCalledWith(SELECTION);
            expect(screen.queryByRole('region', { name: '本次發佈' })).not.toBeInTheDocument();
            expect(screen.queryByText('＋1 短篇')).not.toBeInTheDocument();
            expect(screen.queryByText('1 項修改')).not.toBeInTheDocument();
            expect(screen.queryByText('App 外觀已更改')).not.toBeInTheDocument();
            expect(screen.queryByText(/以下項目尚未完成/)).not.toBeInTheDocument();
            expect(screen.getByText('✓ 驗證通過')).toBeInTheDocument();
            const cards = [...timeline.querySelectorAll('.tl-entry')].map((el) => el.textContent);
            expect(cards).toEqual([
                'App 外觀名稱與簡介發佈後自動重新部署播放器（約 5 分鐘）；已安裝的 App 須重新安裝方會更新圖示',
                '蘭茜夫人劇場新短篇戀愛後二分一第 1–20 集',
                '口水多過浪花修改節目',
                '森美小儀系列未完成大衛營尚未設定排期',
            ]);
            const skip = timeline.querySelector('.timeline > li:last-child');
            expect(skip).toHaveClass('skip');
            expect(skip).toHaveTextContent(/^不會在本次發佈設定完成後可再發佈/);
        });

        it('should hide the skip group when nothing is incomplete', async () => {
            vi.mocked(getChanges).mockResolvedValue(SELECTED);
            renderAt(
                `/publish?${new URLSearchParams({ selection: JSON.stringify(SELECTION) }).toString()}`,
                '/publish',
                <PublishPage />,
                fakeData({ entries: resource([LANCY]) }),
            );
            await screen.findByRole('region', { name: '上線時間' });
            await waitForLoaded();
            expect(screen.queryByText('不會在本次發佈')).not.toBeInTheDocument();
            expect(document.querySelector('.timeline > li.skip')).toBeNull();
        });

        it('should list a pick the server skipped in 不會在本次發佈', async () => {
            open({
                selection: {
                    content: [],
                    skipped: [{ key: 'newArc/lancy/love-after', reason: 'incomplete' }],
                },
            });
            const timeline = await screen.findByRole('region', { name: '上線時間' });
            const skip = await within(timeline).findByText('不會在本次發佈');
            const group = skip.closest('li')!;
            expect(group).toHaveTextContent('蘭茜夫人劇場未完成戀愛後二分一');
            expect(group).toHaveTextContent('森美小儀系列未完成大衛營尚未設定排期');
        });

        it('should fall back to the default selection without one in the URL', async () => {
            vi.mocked(getChanges).mockResolvedValue(SELECTED);
            renderAt('/publish', '/publish', <PublishPage />, data());
            await screen.findByRole('region', { name: '上線時間' });
            expect(getChanges).toHaveBeenLastCalledWith(SELECTION);
        });

        it('should POST the selection and say when incomplete picks were skipped', async () => {
            vi.mocked(publish).mockResolvedValue({
                publish: { id: 7 } as PublishSummary,
                selection: {
                    content: [],
                    skipped: [{ key: 'newArc/sammy/camp', reason: 'incomplete' }],
                },
            });
            open();
            await screen.findByRole('region', { name: '上線時間' });
            await waitForLoaded();
            await userEvent.click(screen.getByRole('button', { name: '發佈' }));
            expect(publish).toHaveBeenCalledWith(SELECTION);
            expect(
                await screen.findByText('已發佈 #7；1 項尚未完成，沒有發佈'),
            ).toBeInTheDocument();
            expect(screen.getByText('other page')).toBeInTheDocument();
        });

        it('should ask to reload when the selection keys are stale (422)', async () => {
            vi.mocked(getChanges).mockRejectedValue(
                new ValidationError(422, 'unknown selection keys'),
            );
            const fake = data();
            renderAt(
                `/publish?${new URLSearchParams({ selection: JSON.stringify(SELECTION) }).toString()}`,
                '/publish',
                <PublishPage />,
                fake,
            );
            const alert = await screen.findByRole('alert');
            expect(alert).toHaveTextContent('此頁資料已過時');
            expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
            await userEvent.click(screen.getByRole('button', { name: '重新載入' }));
            expect(fake.refresh).toHaveBeenCalled();
            expect(await screen.findByTestId('location')).toHaveTextContent(/^\/$/);
        });

        it('should ask to reload when publish answers 422 unknown keys', async () => {
            vi.mocked(publish).mockRejectedValue(
                new ValidationError(422, 'unknown selection keys'),
            );
            open();
            await screen.findByRole('region', { name: '上線時間' });
            await waitForLoaded();
            await userEvent.click(screen.getByRole('button', { name: '發佈' }));
            expect(await screen.findByRole('button', { name: '重新載入' })).toBeInTheDocument();
        });
    });
});
