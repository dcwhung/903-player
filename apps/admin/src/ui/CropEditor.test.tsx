import { act, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { themeOf } from '../model/theme';
import { CROP_MODE, type CropRect } from './cropGeometry';
import { CropEditor } from './CropEditor';
import { drawChoice, type CropChoice } from './cropRender';
import type { ReadySource } from './useCropSession';

vi.mock('./cropRender', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./cropRender')>()),
    drawChoice: vi.fn(),
}));

const SOURCE = { width: 2000, height: 1000 };
const BOX: CropRect = { x: 500, y: 0, width: 1000, height: 1000 };
const READY: ReadySource = {
    file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
    loaded: {
        file: new Blob(['x']),
        image: { width: SOURCE.width, height: SOURCE.height, close: vi.fn() },
        source: SOURCE,
    } as unknown as ReadySource['loaded'],
    name: 'photo.jpg',
    sourceUrl: 'blob:x',
    choice: { mode: CROP_MODE.CENTER, box: BOX },
};

/** 好似 useCropSession 咁：onChoice 即刻更新 ready.choice */
function Harness() {
    const [choice, setChoice] = useState<CropChoice>(READY.choice);
    return (
        <CropEditor
            ready={{ ...READY, choice }}
            slot="disc"
            info={{ name: '蘭茜', theme: themeOf({}) }}
            disabled={false}
            onChoice={setChoice}
            onPickOther={vi.fn()}
        />
    );
}

const manualFrames = () => {
    let queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        queue.push(callback);
        return queue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
        queue[id - 1] = () => {};
    });
    return () =>
        act(() => {
            const frame = queue;
            queue = [];
            frame.forEach((callback) => callback(0));
        });
};

/** 有冇畫過候選掣入面 / 播放器預覽嘅 canvas */
const drawsIn = (selector: string) =>
    vi.mocked(drawChoice).mock.calls.filter(([canvas]) => canvas.closest(selector) !== null).length;

describe('CropEditor', () => {
    beforeEach(() => vi.mocked(drawChoice).mockClear());

    it('should redraw the player preview while dragging but the candidates only on release', () => {
        const nextFrame = manualFrames();
        const { container } = render(<Harness />);
        const image = container.querySelector('.src img') as HTMLImageElement;
        vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({ width: 1000 } as DOMRect);
        const box = container.querySelector('.box') as HTMLElement;
        nextFrame();
        vi.mocked(drawChoice).mockClear();

        fireEvent.pointerDown(box, { clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(box, { clientX: 90, clientY: 100, pointerId: 1 });
        nextFrame();
        fireEvent.pointerMove(box, { clientX: 80, clientY: 100, pointerId: 1 });
        nextFrame();

        expect(drawsIn('.cands')).toBe(0);
        expect(drawsIn('.pv')).toBe(2);

        fireEvent.pointerUp(box, { pointerId: 1 });
        nextFrame();

        expect(drawsIn('.cands')).toBe(1);
        const [, , drawn] = vi
            .mocked(drawChoice)
            .mock.calls.find(([canvas]) => canvas.closest('.cands')) ?? [null, null, null];
        expect(drawn).toEqual({ mode: CROP_MODE.CENTER, box: { ...BOX, x: 460 } });
    });
});
