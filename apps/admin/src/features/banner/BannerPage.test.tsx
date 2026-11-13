import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasIcon } from '../../../tests/icons';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse } from '../../api/types';
import { loadSource, renderOutput } from '../../ui/imageCrop';
import { BannerPage } from './BannerPage';

vi.mock('../../ui/imageCrop', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../ui/imageCrop')>()),
    loadSource: vi.fn(),
    renderOutput: vi.fn(),
}));

const CUSTOM = { standard: 'aaaaaaaaaaaaaaaa.webp', long: 'bbbbbbbbbbbbbbbb.webp' };

const changes = (bannerChanged: boolean): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 1 },
    warnings: [],
    bannerChanged,
});

const show = (bannerChanged = false) =>
    renderAt(
        '/appearance',
        '/appearance',
        <BannerPage />,
        fakeData({ changes: resource(changes(bannerChanged)) }),
    );

const pick = async () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'banner-2026.jpg', { type: 'image/jpeg' }));
};

describe('BannerPage', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'URL',
            Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
        );
        vi.mocked(loadSource).mockResolvedValue({
            file: new Blob(['x'], { type: 'image/jpeg' }),
            image: { width: 2400, height: 1000, close: vi.fn() } as unknown as ImageBitmap,
            source: { width: 2400, height: 1000 },
        });
        vi.mocked(renderOutput).mockImplementation(async (_loaded, _choice, slot) => ({
            blob: new Blob([slot], { type: 'image/webp' }),
            source: { width: 2400, height: 1000 },
            target: { width: 1, height: 1 },
            crop: null,
        }));
    });

    it('should show the built-in banners with 內建預設 and 還原預設 disabled', async () => {
        mockApi({ 'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }) });
        show();
        expect(await screen.findByText('內建預設')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '還原預設' })).toBeDisabled();
        // 兩個 slot 掣名唔同，螢幕閱讀器分得出窄版 / 闊版（S-914）
        expect(
            screen.getByRole('button', { name: '更換首頁 Banner（由窄版開始）— 窄版' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: '更換首頁 Banner（由窄版開始）— 闊版' }),
        ).toBeInTheDocument();
        expect(screen.getByText('窄版（手機直版）')).toBeInTheDocument();
        expect(screen.getByText('輸出 2000 × 400 WebP')).toBeInTheDocument();
    });

    it('should mark a custom banner that is not published yet', async () => {
        mockApi({ 'GET /api/banner': () => ({ body: { banner: CUSTOM, updatedAt: 'x' } }) });
        show(true);
        expect(await screen.findByText('自訂 · 未發佈')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '還原預設' })).toBeEnabled();
    });

    it('should crop 窄版 then 闊版 in one dialog and upload both before saving the banner', async () => {
        const bodies: unknown[] = [];
        let assets = 0;
        mockApi({
            'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
            'PUT /api/assets': () => ({ body: { name: `${'c'.repeat(15)}${++assets}.webp` } }),
            'PUT /api/banner': (init) => {
                bodies.push(JSON.parse(String(init.body)));
                return { body: { banner: CUSTOM, updatedAt: 'x' } };
            },
        });
        show();
        const change = await screen.findByRole('button', { name: '更換 Banner' });
        expect(hasIcon(change, 'upload')).toBe(true);
        await userEvent.click(change);
        await pick();
        const first = await screen.findByRole('dialog', { name: /窄版/ });
        expect(within(first).getByText('1 / 2')).toBeInTheDocument();
        expect(within(first).getByRole('button', { name: '取消' })).toBeEnabled();
        await userEvent.click(within(first).getByRole('button', { name: '下一張：闊版' }));
        const second = await screen.findByRole('dialog', { name: /闊版/ });
        expect(within(second).getByText('2 / 2')).toBeInTheDocument();
        await userEvent.click(within(second).getByRole('button', { name: '上一張' }));
        await screen.findByRole('dialog', { name: /窄版/ });
        await userEvent.click(screen.getByRole('button', { name: '下一張：闊版' }));
        await userEvent.click(await screen.findByRole('button', { name: '上載兩張' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(bodies).toEqual([
            { standard: `${'c'.repeat(15)}1.webp`, long: `${'c'.repeat(15)}2.webp` },
        ]);
    });

    it('should write nothing when the two-step change is cancelled', async () => {
        const api = mockApi({
            'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '更換 Banner' }));
        await pick();
        await userEvent.click(await screen.findByRole('button', { name: '下一張：闊版' }));
        await userEvent.click(await screen.findByRole('button', { name: '取消' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(api.mock.calls.every(([, init]) => (init?.method ?? 'GET') === 'GET')).toBe(true);
    });

    it('should restore the default only after confirming', async () => {
        const deleted = vi.fn(() => ({}));
        mockApi({
            'GET /api/banner': () => ({ body: { banner: CUSTOM, updatedAt: 'x' } }),
            'DELETE /api/banner': deleted,
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '還原預設' }));
        const dialog = screen.getByRole('dialog', { name: '還原預設 Banner？' });
        expect(dialog).toHaveTextContent('兩張自訂 Banner 將被刪除');
        await userEvent.click(within(dialog).getByRole('button', { name: '還原預設' }));
        await waitFor(() => expect(deleted).toHaveBeenCalledOnce());
    });
});
