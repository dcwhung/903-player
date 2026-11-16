import { act, render } from '@testing-library/react';
import { ChoiceCanvas } from './ChoiceCanvas';
import { CROP_MODE, type CropMode } from './cropGeometry';
import { drawChoice, type CropChoice } from './cropRender';
import type { LoadedSource } from './imageCrop';

vi.mock('./cropRender', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./cropRender')>()),
    drawChoice: vi.fn(),
}));

const LOADED = {
    file: new Blob(['x']),
    image: { width: 2000, height: 1000, close: vi.fn() },
    source: { width: 2000, height: 1000 },
} as unknown as LoadedSource;
const TARGET = { width: 600, height: 600 };
const BOX = { x: 500, y: 0, width: 1000, height: 1000 };

/** requestAnimationFrame 排隊，test 自己決定幾時「下一格」 */
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

const choiceOf = (mode: CropMode, box = BOX): CropChoice => ({ mode, box: { ...box } });

const renderCanvas = (choice: CropChoice) => {
    const view = render(<ChoiceCanvas loaded={LOADED} choice={choice} target={TARGET} />);
    return (next: CropChoice) =>
        view.rerender(<ChoiceCanvas loaded={LOADED} choice={next} target={TARGET} />);
};

describe('ChoiceCanvas', () => {
    beforeEach(() => vi.mocked(drawChoice).mockClear());

    it('should draw once on the next frame', () => {
        const nextFrame = manualFrames();
        renderCanvas(choiceOf(CROP_MODE.CENTER));
        nextFrame();
        expect(drawChoice).toHaveBeenCalledTimes(1);
    });

    it('should not redraw when a new choice object has the same mode and box', () => {
        const nextFrame = manualFrames();
        const rerender = renderCanvas(choiceOf(CROP_MODE.CENTER));
        nextFrame();
        rerender(choiceOf(CROP_MODE.CENTER));
        nextFrame();
        expect(drawChoice).toHaveBeenCalledTimes(1);
    });

    it('should not redraw a whole-image candidate when only the crop box moves', () => {
        const nextFrame = manualFrames();
        const rerender = renderCanvas(choiceOf(CROP_MODE.BLUR));
        nextFrame();
        rerender(choiceOf(CROP_MODE.BLUR, { ...BOX, x: 400 }));
        rerender(choiceOf(CROP_MODE.BLUR, { ...BOX, x: 300 }));
        nextFrame();
        expect(drawChoice).toHaveBeenCalledTimes(1);
    });

    it('should draw only the latest box once per frame while the box keeps moving', () => {
        const nextFrame = manualFrames();
        const rerender = renderCanvas(choiceOf(CROP_MODE.CENTER));
        nextFrame();
        rerender(choiceOf(CROP_MODE.CENTER, { ...BOX, x: 450 }));
        rerender(choiceOf(CROP_MODE.CENTER, { ...BOX, x: 400 }));
        rerender(choiceOf(CROP_MODE.CENTER, { ...BOX, x: 350 }));
        nextFrame();
        expect(drawChoice).toHaveBeenCalledTimes(2);
        expect(vi.mocked(drawChoice).mock.calls.at(-1)?.[2]).toEqual(
            choiceOf(CROP_MODE.CENTER, { ...BOX, x: 350 }),
        );
    });
});
