/*
 * 預覽 canvas（用戶 2026-11-16）：Android 圓形 / 方形預覽四邊有空位。maskable 預覽同上載嘅 PNG 一樣，
 * 裁切框填滿成個 canvas，底色只喺透明位後面
 */
import { act, render } from '@testing-library/react';
import type { LoadedSource } from '../../ui/imageCrop';
import { IconCanvas } from './IconCanvas';

const LOADED = {
    file: new Blob(),
    image: { width: 400, height: 400, close: vi.fn() },
    source: { width: 400, height: 400 },
} as unknown as LoadedSource;
const BOX = { x: 10, y: 20, width: 300, height: 300 };

const drawCalls = (background: string | null) => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage,
        fillRect,
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
    });
    act(() => {
        render(<IconCanvas loaded={LOADED} box={BOX} background={background} />);
    });
    return { drawImage, fillRect };
};

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('IconCanvas', () => {
    it('should fill the whole preview with the crop when it is maskable', () => {
        const { drawImage, fillRect } = drawCalls('#98bdde');
        expect(fillRect).toHaveBeenCalledWith(0, 0, 128, 128);
        expect(drawImage.mock.calls[0]?.slice(1)).toEqual([10, 20, 300, 300, 0, 0, 128, 128]);
    });

    it('should fill the whole preview without a background when it is not maskable', () => {
        const { drawImage, fillRect } = drawCalls(null);
        expect(fillRect).not.toHaveBeenCalled();
        expect(drawImage.mock.calls[0]?.slice(1)).toEqual([10, 20, 300, 300, 0, 0, 128, 128]);
    });
});
