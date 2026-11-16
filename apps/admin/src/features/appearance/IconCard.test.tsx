import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import builtInSource from '../../assets/icon/app-icon.png';
import type { BrandingIcon, ChangesResponse } from '../../api/types';
import { loadSource } from '../../ui/imageCrop';
import { IconCard } from './IconCard';
import { renderIcons } from './iconRender';

vi.mock('../../ui/imageCrop', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../ui/imageCrop')>()),
    loadSource: vi.fn(),
}));
vi.mock('./iconRender', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./iconRender')>()),
    renderIcons: vi.fn(),
}));
vi.mock('./iconColours', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./iconColours')>()),
    sampleEdgeColours: () => ['#0b0b0b', '#f39200'],
}));

const changesRes: ChangesResponse = {
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 1 },
    warnings: [],
    brandingChanged: false,
};

const show = () =>
    renderAt(
        '/appearance',
        '/appearance',
        <IconCard />,
        fakeData({ changes: resource(changesRes) }),
    );

const pick = async () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'logo.png', { type: 'image/png' }));
};

const ICON_BLOBS = Object.fromEntries(
    ['favicon', 'appleTouch', 'icon192', 'icon512', 'maskable'].map((key) => [
        key,
        new Blob([key], { type: 'image/png' }),
    ]),
);

describe('IconCard', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'URL',
            Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
        );
        vi.mocked(loadSource).mockResolvedValue({
            file: new Blob(['x'], { type: 'image/png' }),
            image: { width: 1400, height: 1400, close: vi.fn() } as unknown as ImageBitmap,
            source: { width: 1400, height: 1400 },
        });
        vi.mocked(renderIcons).mockResolvedValue(ICON_BLOBS as never);
    });

    it('should crop, upload the original and five PNGs then save branding.icon with the mask colour', async () => {
        let assets = 0;
        let iconBody: unknown;
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
            'PUT /api/assets/source': () => ({ body: { name: 'logo-src.png' } }),
            'PUT /api/assets': () => ({ body: { name: `i${++assets}.png` } }),
            'PUT /api/branding/icon': (init) => {
                iconBody = JSON.parse(String(init.body));
                return { body: { icon: null, text: null, updatedAt: 'x' } };
            },
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '更換 App 圖示' }));
        await pick();
        const dialog = await screen.findByRole('dialog', { name: '更換 App 圖示' });
        await userEvent.click(within(dialog).getByRole('button', { name: '上載' }));
        await waitFor(() => expect(assets).toBe(5));
        expect(iconBody).toEqual({
            favicon: 'i1.png',
            appleTouch: 'i2.png',
            icon192: 'i3.png',
            icon512: 'i4.png',
            maskable: 'i5.png',
            maskableBackground: '#0b0b0b',
            source: { image: 'logo-src.png', same: true, boxes: expect.any(Object) },
        });
    });

    it('should let each device have its own crop when the shared crop is unchecked', async () => {
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '更換 App 圖示' }));
        await pick();
        await screen.findByRole('dialog', { name: '更換 App 圖示' });
        const checkbox = await screen.findByRole('checkbox', { name: '所有裝置使用同一裁切' });
        const android = screen.getByRole('button', { name: 'Android' });
        expect(android).toBeDisabled();
        await userEvent.click(checkbox);
        expect(android).toBeEnabled();
        await userEvent.click(android);
        expect(android).toHaveAttribute('aria-pressed', 'true');
    });

    it('should move focus to 更換 when 還原 disappears after restoring (S-1013)', async () => {
        const custom = {
            favicon: 'f.png',
            appleTouch: 'a.png',
            icon192: 'i.png',
            icon512: 'j.png',
            maskable: 'm.png',
            maskableBackground: '#000000',
        };
        let icon: typeof custom | null = custom;
        mockApi({
            'GET /api/branding': () => ({ body: { icon, text: null, updatedAt: icon && 'x' } }),
            'DELETE /api/branding/icon': () => ((icon = null), {}),
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '還原 App 圖示' }));
        const dialog = screen.getByRole('dialog', { name: '還原 App 圖示？' });
        await userEvent.click(within(dialog).getByRole('button', { name: '還原' }));
        await screen.findByText('內建預設');
        await waitFor(() =>
            expect(screen.getByRole('button', { name: '更換 App 圖示' })).toHaveFocus(),
        );
    });

    describe('adjusting one device from its preview', () => {
        const BOXES = {
            ios: { x: 100, y: 100, width: 600, height: 600 },
            android: { x: 200, y: 150, width: 900, height: 900 },
            tab: { x: 0, y: 0, width: 1400, height: 1400 },
        };
        const STORED: BrandingIcon = {
            favicon: 'f.png',
            appleTouch: 'a.png',
            icon192: 'i.png',
            icon512: 'j.png',
            maskable: 'm.png',
            maskableBackground: '#f39200',
            source: { image: 'src.png', same: true, boxes: BOXES },
        };

        const serve = (icon: BrandingIcon | null, extra: Parameters<typeof mockApi>[0] = {}) => {
            const saved: { body?: BrandingIcon; sources: number } = { sources: 0 };
            let assets = 0;
            const api = mockApi({
                'GET /api/branding': () => ({ body: { icon, text: null, updatedAt: 'x' } }),
                'GET /catalog/v1/img/src.png': () => ({ body: {} }),
                'GET /catalog/v1/img/j.png': () => ({ body: {} }),
                [`GET ${builtInSource}`]: () => ({ body: {} }),
                'PUT /api/assets/source': () => (saved.sources++, { body: { name: 'new.png' } }),
                'PUT /api/assets': () => ({ body: { name: `i${++assets}.png` } }),
                'PUT /api/branding/icon': (init) => {
                    saved.body = JSON.parse(String(init.body)) as BrandingIcon;
                    return { body: { icon: saved.body, text: null, updatedAt: 'y' } };
                },
                ...extra,
            });
            return { api, saved };
        };

        const adjust = async (name: string) => {
            show();
            await userEvent.click(await screen.findByRole('button', { name }));
            return screen.findByRole('dialog', { name: '調整 App 圖示' });
        };

        it('should open the stored original with iPhone chosen on its own', async () => {
            const { api } = serve(STORED);
            const dialog = await adjust('調整 iPhone 主畫面圖示');
            expect(api).toHaveBeenCalledWith('/catalog/v1/img/src.png');
            expect(
                await within(dialog).findByRole('checkbox', { name: '所有裝置使用同一裁切' }),
            ).not.toBeChecked();
            expect(within(dialog).getByRole('button', { name: 'iPhone' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            expect(within(dialog).getByRole('radio', { name: '抽取色 2' })).toHaveAttribute(
                'aria-checked',
                'true',
            );
        });

        it('should open Android from either Android preview', async () => {
            serve(STORED);
            const dialog = await adjust('調整 Android 方形圖示');
            expect(await within(dialog).findByRole('button', { name: 'Android' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
        });

        it('should save every output from the stored original, keeping the other devices crop', async () => {
            const { saved } = serve(STORED);
            const dialog = await adjust('調整 iPhone 主畫面圖示');
            const box = await within(dialog).findByRole('group', { name: /^裁切框/ });
            box.focus();
            await userEvent.keyboard('{ArrowRight}');
            await userEvent.click(within(dialog).getByRole('button', { name: '上載' }));
            await waitFor(() => expect(saved.body).toBeDefined());
            expect(saved.sources).toBe(0);
            const boxes = saved.body?.source?.boxes;
            expect(boxes?.ios.x).toBeGreaterThan(BOXES.ios.x);
            expect(boxes?.android).toEqual(BOXES.android);
            expect(boxes?.tab).toEqual(BOXES.tab);
            expect(saved.body?.source).toMatchObject({ image: 'src.png', same: false });
            expect(saved.body?.maskableBackground).toBe('#f39200');
            expect(renderIcons).toHaveBeenLastCalledWith(expect.anything(), boxes, '#f39200');
        });

        it('should use the 512 icon with a note for an icon saved without an original', async () => {
            const { saved } = serve({ ...STORED, source: undefined });
            const dialog = await adjust('調整 Android 圓形圖示');
            expect(
                await within(dialog).findByText('此圖示未保存原圖，現以 512 × 512 圖示代替原圖。'),
            ).toBeInTheDocument();
            await userEvent.click(within(dialog).getByRole('button', { name: '上載' }));
            await waitFor(() => expect(saved.body?.source?.image).toBe('j.png'));
            expect(saved.sources).toBe(0);
        });

        it('should start the built-in icon from the repo original and upload it on save', async () => {
            const { api, saved } = serve(null);
            const dialog = await adjust('調整 iPhone 主畫面圖示');
            expect(api).toHaveBeenCalledWith(builtInSource);
            expect(within(dialog).getByText('app-icon.png')).toBeInTheDocument();
            await userEvent.click(await within(dialog).findByRole('button', { name: '上載' }));
            await waitFor(() => expect(saved.body?.source?.image).toBe('new.png'));
            expect(saved.sources).toBe(1);
        });

        it('should show the problem when the original cannot be loaded', async () => {
            serve(STORED, { 'GET /catalog/v1/img/src.png': () => ({ status: 404 }) });
            show();
            await userEvent.click(
                await screen.findByRole('button', { name: '調整 iPhone 主畫面圖示' }),
            );
            expect(await screen.findByRole('alert')).toHaveTextContent('無法載入原圖');
        });
    });
});
