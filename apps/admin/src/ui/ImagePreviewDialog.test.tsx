import { render, screen } from '@testing-library/react';
import { ImagePreviewDialog, type PendingImage } from './ImagePreviewDialog';

const image: PendingImage = {
    blob: new Blob(['x'], { type: 'image/webp' }),
    source: { width: 800, height: 600 },
    target: { width: 600, height: 600 },
    crop: { x: 100, y: 0, width: 600, height: 600 },
    name: 'photo.png',
    type: 'image/png',
    sourceUrl: 'blob:source',
    resultUrl: 'blob:result',
};

const resultFrame = () =>
    screen.getByRole('img', { name: /裁切後/ }).closest('.frame') as HTMLElement;

describe('ImagePreviewDialog', () => {
    it('should drop the rectangular frame around a round disc result (circle border only)', () => {
        render(
            <ImagePreviewDialog
                slot="disc"
                image={image}
                busy={false}
                onConfirm={() => {}}
                onCancel={() => {}}
            />,
        );
        expect(resultFrame()).toHaveClass('bare');
    });

    it('should keep the rectangular frame around a banner result', () => {
        render(
            <ImagePreviewDialog
                slot="tile"
                image={image}
                busy={false}
                onConfirm={() => {}}
                onCancel={() => {}}
            />,
        );
        expect(resultFrame()).not.toHaveClass('bare');
    });
});
