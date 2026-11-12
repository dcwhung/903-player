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
        await screen.findByRole('dialog', { name: '上載碟面' });
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

    it('should put the label, size hint and error under its own image', async () => {
        render(
            <>
                <ImageSlot slot="tile" url={undefined} onUploaded={vi.fn()} />
                <ImageSlot slot="disc" url="https://img/disc.webp" onUploaded={vi.fn()} />
            </>,
        );
        const tile = screen.getByRole('button', { name: '上載Banner' }).closest('.slot');
        const disc = screen.getByRole('button', { name: '更換碟面' }).closest('.slot');
        expect(tile).not.toBeNull();
        expect(tile).not.toBe(disc);
        const caption = tile?.querySelector('.slot-cap');
        expect(caption).toHaveTextContent('Banner');
        expect(caption).toHaveTextContent('1216×684 · 尺寸不符會自動裁切');
        expect(disc?.querySelector('.slot-cap')).toHaveTextContent('600×600');
        const { prepareImage } = await import('./imageCrop');
        vi.mocked(prepareImage).mockResolvedValueOnce({ error: '只接受 PNG、JPG 或 WebP 圖片' });
        const input = tile?.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(input, new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('只接受 PNG、JPG 或 WebP 圖片');
        expect(caption).toContainElement(screen.getByRole('alert'));
    });

    it('should show 原圖 and 裁切後 side by side, each described under its own frame', async () => {
        render(<ImageSlot slot="disc" url={undefined} onUploaded={vi.fn()} />);
        await pick();
        await screen.findByRole('dialog', { name: '上載碟面' });
        const source = screen.getByRole('figure', { name: '原圖' });
        const result = screen.getByRole('figure', { name: '裁切後' });
        expect(source.querySelector('.frame')).not.toBeNull();
        expect(result.querySelector('.frame')).not.toBeNull();
        expect(source.querySelector('figcaption')).toHaveTextContent('photo.jpg');
        expect(source.querySelector('figcaption')).toHaveTextContent('1920×1080 · JPEG');
        expect(result.querySelector('figcaption')).toHaveTextContent('600×600 · WebP · 約 1 KB');
        expect(result.querySelector('figcaption')).toHaveTextContent('置中裁切');
    });
});
