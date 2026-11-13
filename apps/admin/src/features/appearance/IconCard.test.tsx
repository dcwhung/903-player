import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse } from '../../api/types';
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

    it('should crop, upload five PNGs then save branding.icon with the mask colour', async () => {
        let assets = 0;
        let iconBody: unknown;
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
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
});
