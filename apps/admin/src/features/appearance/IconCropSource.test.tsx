/*
 * 更換 App 圖示裁切框（用戶 2026-11-16）：撳裝置分頁後成個 dialog 變暗、Android 圓框外有大弧。
 * 暗位要喺原圖入面另一層（.dim，CSS 裁走圖外部分）畫，框同右下角拉柄唔受裁切
 */
import { render } from '@testing-library/react';
import type { CropRect } from '../../ui/cropGeometry';
import { IconCropSource } from './IconCropSource';
import { cropView } from './iconModel';
import type { IconReady } from './iconSession';

const SOURCE = { width: 1000, height: 500 };
const BOX: CropRect = { x: 250, y: 0, width: 500, height: 500 };
const READY = {
    status: 'ready',
    file: new File(['x'], 'icon.png', { type: 'image/png' }),
    loaded: {
        file: new Blob(['x']),
        image: { ...SOURCE, close: vi.fn() },
        source: SOURCE,
    },
    sourceUrl: 'blob:x',
    box: BOX,
    swatches: [],
    seed: {},
} as unknown as IconReady;

const renderSource = (round: boolean) =>
    render(
        <IconCropSource
            ready={READY}
            box={BOX}
            view={cropView(!round, 'android')}
            locked={false}
            onBox={vi.fn()}
        />,
    ).container;

describe('IconCropSource', () => {
    it('should draw the dim in its own layer inside the image, behind the crop box', () => {
        const src = renderSource(false).querySelector('.src');
        const dim = src?.querySelector(':scope > .dim');
        expect(dim).toHaveAttribute('aria-hidden', 'true');
        const hole = dim?.querySelector(':scope > .dim-hole');
        expect(hole).toHaveStyle({ left: '25%', top: '0%', width: '50%', height: '100%' });
        expect(hole).not.toHaveClass('circle');
        // 暗層喺框之前（框同拉柄疊喺上面、唔喺暗層入面）
        const box = src?.querySelector(':scope > .box');
        expect(box?.querySelector('.grip')).not.toBeNull();
        expect(dim?.compareDocumentPosition(box as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('should cut a round hole when the Android crop box is a circle', () => {
        const hole = renderSource(true).querySelector('.dim-hole');
        expect(hole).toHaveClass('circle');
    });
});
