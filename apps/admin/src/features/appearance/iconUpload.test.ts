import { mockApi } from '../../../tests/renderApp';
import type { IconBoxes } from './iconModel';
import type { IconBlobs } from './iconRender';
import { uploadIcons, type IconSourceUpload } from './iconUpload';

const BLOBS = Object.fromEntries(
    ['favicon', 'appleTouch', 'icon192', 'icon512', 'maskable'].map((key) => [
        key,
        new Blob([key], { type: 'image/png' }),
    ]),
) as IconBlobs;

const BOX = { x: 0, y: 0, width: 100, height: 100 };
const BOXES: IconBoxes = { ios: { x: 10, y: 10, width: 50, height: 50 }, android: BOX, tab: BOX };
const ORIGINAL = new Blob(['jpeg'], { type: 'image/jpeg' });
const NEW_SOURCE: IconSourceUpload = { file: ORIGINAL, same: false, boxes: BOXES };

describe('uploadIcons', () => {
    it('should upload the original, five PNGs in order and then save their names, mask colour and crop', async () => {
        let count = 0;
        const bodies: unknown[] = [];
        const sourceTypes: unknown[] = [];
        mockApi({
            'PUT /api/assets/source': (init) => {
                sourceTypes.push(new Headers(init.headers).get('content-type'));
                return { body: { name: 'src.jpg' } };
            },
            'PUT /api/assets': () => ({ body: { name: `${++count}.png` } }),
            'PUT /api/branding/icon': (init) => {
                bodies.push(JSON.parse(String(init.body)));
                return { body: {} };
            },
        });
        const busy = vi.fn();
        expect(await uploadIcons(BLOBS, '#f39200', busy, NEW_SOURCE)).toBeUndefined();
        expect(sourceTypes).toEqual(['image/jpeg']);
        expect(bodies).toEqual([
            {
                favicon: '1.png',
                appleTouch: '2.png',
                icon192: '3.png',
                icon512: '4.png',
                maskable: '5.png',
                maskableBackground: '#f39200',
                source: { image: 'src.jpg', same: false, boxes: BOXES },
            },
        ]);
        expect(busy).toHaveBeenCalledWith('正在上載原圖…');
        expect(busy).toHaveBeenLastCalledWith('正在上載 PNG（5 / 5）…');
    });

    it('should reuse an original that is already stored instead of uploading it again', async () => {
        let body: { source?: unknown } = {};
        const api = mockApi({
            'PUT /api/assets': () => ({ body: { name: 'x.png' } }),
            'PUT /api/branding/icon': (init) => {
                body = JSON.parse(String(init.body)) as typeof body;
                return { body: {} };
            },
        });
        const stored = { ...NEW_SOURCE, storedName: 'kept.png', same: true };
        expect(await uploadIcons(BLOBS, '#000000', vi.fn(), stored)).toBeUndefined();
        expect(body.source).toEqual({ image: 'kept.png', same: true, boxes: BOXES });
        expect(api.mock.calls.map(([url]) => url)).not.toContain('/api/assets/source');
    });

    it('should stop and report the error when an upload fails', async () => {
        const api = mockApi({
            'PUT /api/assets/source': () => ({ body: { name: 'src.jpg' } }),
            'PUT /api/assets': () => ({ status: 422, body: { error: 'bad png' } }),
        });
        expect(await uploadIcons(BLOBS, '#000000', vi.fn(), NEW_SOURCE)).toContain('bad png');
        expect(api).toHaveBeenCalledTimes(2);
    });
});
