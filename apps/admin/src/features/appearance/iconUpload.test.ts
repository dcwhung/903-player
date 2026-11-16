import { mockApi } from '../../../tests/renderApp';
import type { IconBlobs } from './iconRender';
import { uploadIcons } from './iconUpload';

const BLOBS = Object.fromEntries(
    ['favicon', 'appleTouch', 'icon192', 'icon512', 'maskable'].map((key) => [
        key,
        new Blob([key], { type: 'image/png' }),
    ]),
) as IconBlobs;

describe('uploadIcons', () => {
    it('should upload five PNGs in order and then save their names with the mask colour', async () => {
        let count = 0;
        const bodies: unknown[] = [];
        mockApi({
            'PUT /api/assets': () => ({ body: { name: `${++count}.png` } }),
            'PUT /api/branding/icon': (init) => {
                bodies.push(JSON.parse(String(init.body)));
                return { body: {} };
            },
        });
        const busy = vi.fn();
        expect(await uploadIcons(BLOBS, '#f39200', busy)).toBeUndefined();
        expect(bodies).toEqual([
            {
                favicon: '1.png',
                appleTouch: '2.png',
                icon192: '3.png',
                icon512: '4.png',
                maskable: '5.png',
                maskableBackground: '#f39200',
            },
        ]);
        expect(busy).toHaveBeenLastCalledWith('正在上載 PNG（5 / 5）…');
    });

    it('should stop and report the error when an upload fails', async () => {
        const api = mockApi({
            'PUT /api/assets': () => ({ status: 422, body: { error: 'bad png' } }),
        });
        expect(await uploadIcons(BLOBS, '#000000', vi.fn())).toContain('bad png');
        expect(api).toHaveBeenCalledOnce();
    });
});
