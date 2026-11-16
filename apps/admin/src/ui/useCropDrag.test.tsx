import { fireEvent, render, screen } from '@testing-library/react';
import { CROP_MODE, type CropMode, type CropRect } from './cropGeometry';
import { CropSourcePane } from './CropSourcePane';
import type { ReadySource } from './useCropSession';

const SOURCE = { width: 2000, height: 1000 };
/** 原圖喺螢幕顯示 1000 px 闊 = 每 1 螢幕 px 等於 2 原圖 px */
const SHOWN_WIDTH = 1000;
/** 方向鍵 / + / − 一下 = 原圖長邊 2000 × 2% */
const KEY_STEP = 40;
const BOX: CropRect = { x: 500, y: 100, width: 500, height: 500 };

const readyOf = (mode: CropMode, box: CropRect): ReadySource => ({
    file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
    loaded: {
        file: new Blob(['x']),
        image: { width: SOURCE.width, height: SOURCE.height, close: vi.fn() },
        source: SOURCE,
    } as unknown as ReadySource['loaded'],
    name: 'photo.jpg',
    sourceUrl: 'blob:x',
    choice: { mode, box },
});

interface PaneOptions {
    mode?: CropMode;
    disabled?: boolean;
    box?: CropRect;
}

const renderPane = ({ mode = CROP_MODE.CENTER, disabled = false, box = BOX }: PaneOptions = {}) => {
    const onChoice = vi.fn();
    const view = render(
        <CropSourcePane
            ready={readyOf(mode, box)}
            slot="disc"
            disabled={disabled}
            onChoice={onChoice}
        />,
    );
    const image = view.container.querySelector('img') as HTMLImageElement;
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({
        width: SHOWN_WIDTH,
    } as DOMRect);
    const boxElement = view.container.querySelector('.box') as HTMLElement;
    const grip = view.container.querySelector('.grip') as HTMLElement;
    return { onChoice, box: boxElement, grip };
};

const lastBox = (onChoice: ReturnType<typeof vi.fn>) =>
    (onChoice.mock.calls.at(-1)?.[0] as { box: CropRect } | undefined)?.box;

describe('useCropDrag (via CropSourcePane)', () => {
    describe('keyboard', () => {
        it('should move the box by one step when an arrow key is pressed', () => {
            const { onChoice } = renderPane();
            const box = screen.getByRole('group', { name: '裁切框（方向鍵移位，+ / − 縮放）' });

            fireEvent.keyDown(box, { key: 'ArrowLeft' });
            expect(lastBox(onChoice)).toEqual({ ...BOX, x: BOX.x - KEY_STEP });
            fireEvent.keyDown(box, { key: 'ArrowDown' });
            expect(lastBox(onChoice)).toEqual({ ...BOX, y: BOX.y + KEY_STEP });
            expect(onChoice).toHaveBeenLastCalledWith(
                expect.objectContaining({ mode: CROP_MODE.CENTER }),
            );
        });

        it('should keep the box inside the source when an arrow pushes past the edge', () => {
            const nearTop = { ...BOX, y: 10 };
            const { onChoice, box } = renderPane({ box: nearTop });
            fireEvent.keyDown(box, { key: 'ArrowUp' });
            expect(lastBox(onChoice)).toEqual({ ...nearTop, y: 0 });
        });

        it('should grow on + / = and shrink on − keeping the ratio', () => {
            const { onChoice, box } = renderPane();
            fireEvent.keyDown(box, { key: '+' });
            expect(lastBox(onChoice)).toEqual({ ...BOX, width: 540, height: 540 });
            fireEvent.keyDown(box, { key: '=' });
            expect(lastBox(onChoice)).toEqual({ ...BOX, width: 540, height: 540 });
            fireEvent.keyDown(box, { key: '-' });
            expect(lastBox(onChoice)).toEqual({ ...BOX, width: 460, height: 460 });
        });

        it('should ignore other keys', () => {
            const { onChoice, box } = renderPane();
            fireEvent.keyDown(box, { key: 'a' });
            fireEvent.keyDown(box, { key: 'Enter' });
            expect(onChoice).not.toHaveBeenCalled();
        });
    });

    describe('pointer', () => {
        it('should move the box by the dragged distance in source pixels', () => {
            const { onChoice, box } = renderPane();
            fireEvent.pointerDown(box, { clientX: 100, clientY: 100, pointerId: 1 });
            fireEvent.pointerMove(box, { clientX: 110, clientY: 120, pointerId: 1 });
            expect(lastBox(onChoice)).toEqual({ ...BOX, x: 520, y: 140 });
            // 每次都由撳落嗰陣個框計，唔會累積
            fireEvent.pointerMove(box, { clientX: 105, clientY: 100, pointerId: 1 });
            expect(lastBox(onChoice)).toEqual({ ...BOX, x: 510 });
        });

        it('should resize from the bottom-right grip without moving the box', () => {
            const { onChoice, grip } = renderPane();
            fireEvent.pointerDown(grip, { clientX: 100, clientY: 100, pointerId: 1 });
            fireEvent.pointerMove(grip, { clientX: 110, clientY: 100, pointerId: 1 });
            expect(lastBox(onChoice)).toEqual({ ...BOX, width: 520, height: 520 });
        });

        it('should stop following the pointer after pointerup', () => {
            const { onChoice, box } = renderPane();
            fireEvent.pointerDown(box, { clientX: 100, clientY: 100, pointerId: 1 });
            fireEvent.pointerUp(box, { pointerId: 1 });
            fireEvent.pointerMove(box, { clientX: 150, clientY: 150, pointerId: 1 });
            expect(onChoice).not.toHaveBeenCalled();
        });

        it('should not follow a pointer move without a pointerdown first', () => {
            const { onChoice, box } = renderPane();
            fireEvent.pointerMove(box, { clientX: 150, clientY: 150, pointerId: 1 });
            expect(onChoice).not.toHaveBeenCalled();
        });
    });

    describe('locked', () => {
        it.each([
            ['a whole-image candidate is chosen', { mode: CROP_MODE.BLUR as CropMode }],
            ['the dialog is busy', { disabled: true }],
        ])('should not move or resize when %s', (_case, options) => {
            const { onChoice, box, grip } = renderPane(options);
            expect(screen.queryByRole('group')).not.toBeInTheDocument();
            fireEvent.keyDown(box, { key: 'ArrowLeft' });
            fireEvent.keyDown(box, { key: '+' });
            fireEvent.pointerDown(box, { clientX: 100, clientY: 100, pointerId: 1 });
            fireEvent.pointerMove(box, { clientX: 150, clientY: 150, pointerId: 1 });
            fireEvent.pointerDown(grip, { clientX: 100, clientY: 100, pointerId: 1 });
            fireEvent.pointerMove(grip, { clientX: 150, clientY: 150, pointerId: 1 });
            expect(onChoice).not.toHaveBeenCalled();
        });
    });
});
