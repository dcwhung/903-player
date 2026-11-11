import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../../tests/renderApp';
import { ImageSlot } from './ImageSlot';

vi.mock('./imageCrop', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./imageCrop')>()),
    prepareImage: vi.fn(() =>
        Promise.resolve({
            blob: new Blob(['w'], { type: 'image/webp' }),
            source: { width: 1920, height: 1080 },
            target: { width: 600, height: 600 },
            crop: { x: 420, y: 0, width: 1080, height: 1080 },
        }),
    ),
}));

const pick = async () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
};

describe('ImageSlot', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'URL',
            Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
        );
    });

    it('should accept PNG / JPG / WebP and preview the centre crop before uploading', async () => {
        const api = mockApi({ 'PUT /api/assets': () => ({ body: { name: 'abc.webp' } }) });
        const onUploaded = vi.fn();
        render(<ImageSlot slot="disc" url={undefined} onUploaded={onUploaded} />);
        expect(document.querySelector('input[type="file"]')).toHaveAttribute(
            'accept',
            'image/png,image/jpeg,image/webp',
        );
        await pick();
        const dialog = await screen.findByRole('dialog', { name: '上載碟面' });
        expect(dialog).toHaveTextContent('photo.jpg · 1920×1080 → 600×600 WebP（置中裁切）');
        expect(api).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: '上載' }));
        await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('abc.webp'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should upload nothing when the preview is cancelled', async () => {
        const api = mockApi({});
        render(<ImageSlot slot="disc" url={undefined} onUploaded={vi.fn()} />);
        await pick();
        await userEvent.click(await screen.findByRole('button', { name: '取消' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(api).not.toHaveBeenCalled();
    });
});
