import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import { ValidationError } from '../../api/client';
import { getChanges, publish } from '../../api/publishEndpoints';
import type { ChangeItem } from '@903-player/catalog';
import type { ChangesResponse, PublishSummary, PublishWarning, TodoRow } from '../../api/types';
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
        expect(await screen.findByText('首頁 Banner 已更改')).toBeInTheDocument();
        await waitForLoaded();
        expect(screen.getByText('本次只更改首頁 Banner。')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled();
    });

    it('should keep 發佈 disabled when nothing changed', async () => {
        show(changesOf());
        await waitForLoaded();
        expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
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
        const data = () =>
            fakeData({
                todos: resource({ rows: ROWS, blocking: 1 }),
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

        it('should list what goes out, what is incomplete and the redeploy note', async () => {
            open();
            const card = await screen.findByRole('region', { name: '今次發佈' });
            expect(getChanges).toHaveBeenLastCalledWith(SELECTION);
            expect(card).toHaveTextContent('新短篇 · 蘭茜夫人劇場 › 戀愛後二分一');
            expect(card).toHaveTextContent('App 外觀 · 名稱與簡介');
            expect(card).toHaveTextContent('其他已儲存的改動');
            expect(card).toHaveTextContent('修改 · 口水多過浪花');
            expect(card).toHaveTextContent(
                '以下項目尚未完成，不會在今次發佈：森美小儀系列 › 大衛營（尚未設定排期）。',
            );
            expect(card).toHaveTextContent(/圖示、名稱及簡介須重新部署播放器/);
        });

        it('should fall back to the default selection without one in the URL', async () => {
            vi.mocked(getChanges).mockResolvedValue(SELECTED);
            renderAt('/publish', '/publish', <PublishPage />, data());
            await screen.findByRole('region', { name: '今次發佈' });
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
            await screen.findByRole('region', { name: '今次發佈' });
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
            await screen.findByRole('region', { name: '今次發佈' });
            await waitForLoaded();
            await userEvent.click(screen.getByRole('button', { name: '發佈' }));
            expect(await screen.findByRole('button', { name: '重新載入' })).toBeInTheDocument();
        });
    });
});
