import { checkImageFile } from './imageUpload';

const webp = () => new File([new Uint8Array([1, 2, 3])], 'disc.webp', { type: 'image/webp' });

describe('checkImageFile', () => {
    it('should reject non-WebP files without decoding', async () => {
        const decode = vi.fn();
        vi.stubGlobal('createImageBitmap', decode);
        const png = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
        await expect(checkImageFile(png, 'disc')).resolves.toBe('只接受 WebP 圖片');
        expect(decode).not.toHaveBeenCalled();
    });

    it('should reject files the browser cannot decode', async () => {
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(() => Promise.reject(new Error('bad'))),
        );
        await expect(checkImageFile(webp(), 'disc')).resolves.toBe('無法讀取此圖片');
    });

    it('should check the slot dimensions', async () => {
        const bitmap = (width: number, height: number) => ({ width, height, close: vi.fn() });
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(() => Promise.resolve(bitmap(600, 600))),
        );
        await expect(checkImageFile(webp(), 'disc')).resolves.toBeUndefined();
        await expect(checkImageFile(webp(), 'tile')).resolves.toBe(
            '橫額尺寸須為 1216×684（現為 600×600）',
        );
    });
});
