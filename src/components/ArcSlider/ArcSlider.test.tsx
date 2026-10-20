import { fireEvent, render, screen } from '@testing-library/react';
import { ArcSlider } from './ArcSlider';

const MAX = 1000;
const VIEWBOX = 300;

const renderSlider = (value = 400, locked = false) => {
    const onSeek = vi.fn();
    const onOuterPointer = vi.fn();
    render(
        // 模擬今日節目卡疊：冇被 ArcSlider 截住嘅 pointer event 會傳到呢度
        <div onPointerDown={onOuterPointer} onPointerMove={onOuterPointer}>
            <ArcSlider
                value={value}
                max={MAX}
                onSeek={onSeek}
                label="播放進度"
                formatValueText={(seconds) => `v${Math.round(seconds)}`}
                locked={locked}
            />
        </div>,
    );
    const slider = screen.getByRole('slider', { name: '播放進度' });
    slider.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: VIEWBOX, height: VIEWBOX }) as DOMRect;
    return { slider, onSeek, onOuterPointer };
};

describe('ArcSlider', () => {
    it('exposes slider semantics', () => {
        const { slider } = renderSlider();

        expect(slider).toHaveAttribute('aria-valuemin', '0');
        expect(slider).toHaveAttribute('aria-valuemax', String(MAX));
        expect(slider).toHaveAttribute('aria-valuenow', '400');
        expect(slider).toHaveAttribute('aria-valuetext', 'v400');
    });

    it('previews while dragging and seeks on release', () => {
        const { slider, onSeek } = renderSlider();

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 10, clientY: 150, pointerId: 1 });
        expect(slider).toHaveAttribute('aria-valuenow', String(Math.round(MAX / 6)));
        expect(slider).toHaveAttribute('aria-valuetext', `v${Math.round(MAX / 6)}`);
        expect(onSeek).not.toHaveBeenCalled();

        fireEvent.pointerUp(slider, { clientX: 10, clientY: 150, pointerId: 1 });
        expect(onSeek).toHaveBeenCalledWith(expect.closeTo(MAX / 6, 3));
    });

    it('does not jump from the end to the start when dragged across the bottom gap', () => {
        const { slider, onSeek } = renderSlider();

        fireEvent.pointerDown(slider, { clientX: 290, clientY: 150, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 160, clientY: 290, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 140, clientY: 290, pointerId: 1 });
        expect(slider).toHaveAttribute('aria-valuenow', String(MAX));

        fireEvent.pointerUp(slider, { clientX: 140, clientY: 290, pointerId: 1 });
        expect(onSeek).toHaveBeenCalledWith(MAX);
    });

    it('does not jump from the start to the end when dragged backwards into the gap', () => {
        const { slider, onSeek } = renderSlider();

        fireEvent.pointerDown(slider, { clientX: 10, clientY: 150, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 160, clientY: 290, pointerId: 1 });
        fireEvent.pointerUp(slider, { clientX: 160, clientY: 290, pointerId: 1 });

        expect(onSeek).toHaveBeenCalledWith(0);
    });

    it('leaves the corners and the disc to the parent (card swipe)', () => {
        const { slider, onSeek, onOuterPointer } = renderSlider();

        fireEvent.pointerDown(slider, { clientX: 5, clientY: 5, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 100, clientY: 8, pointerId: 1 });
        fireEvent.pointerUp(slider, { clientX: 100, clientY: 8, pointerId: 1 });
        fireEvent.pointerDown(slider, { clientX: 150, clientY: 150, pointerId: 2 });

        expect(onOuterPointer).toHaveBeenCalledTimes(3);
        expect(onSeek).not.toHaveBeenCalled();
        expect(slider).toHaveAttribute('aria-valuenow', '400');
    });

    it('leaves the bottom gap to the parent but still grabs the start of the ring', () => {
        const { slider, onSeek, onOuterPointer } = renderSlider();

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 290, pointerId: 1 });
        fireEvent.pointerUp(slider, { clientX: 150, clientY: 290, pointerId: 1 });
        expect(onOuterPointer).toHaveBeenCalledTimes(1);

        fireEvent.pointerDown(slider, { clientX: 51, clientY: 249, pointerId: 2 });
        fireEvent.pointerUp(slider, { clientX: 51, clientY: 249, pointerId: 2 });
        expect(onOuterPointer).toHaveBeenCalledTimes(1);
        expect(onSeek).toHaveBeenCalledWith(0);
    });

    it('keeps a ring drag to itself', () => {
        const { slider, onOuterPointer } = renderSlider();

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(slider, { clientX: 10, clientY: 150, pointerId: 1 });

        expect(onOuterPointer).not.toHaveBeenCalled();
    });

    it('ignores a new ring drag while locked by the disc, without passing it on', () => {
        const { slider, onSeek, onOuterPointer } = renderSlider(400, true);

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerUp(slider, { clientX: 150, clientY: 10, pointerId: 1 });

        expect(onSeek).not.toHaveBeenCalled();
        expect(onOuterPointer).not.toHaveBeenCalled();
    });

    it('cancels a gesture without seeking', () => {
        const { slider, onSeek } = renderSlider();

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerCancel(slider, { pointerId: 1 });

        expect(onSeek).not.toHaveBeenCalled();
        expect(slider).toHaveAttribute('aria-valuenow', '400');
    });

    it('ignores pointer moves when not dragging', () => {
        const { slider, onSeek } = renderSlider();

        fireEvent.pointerMove(slider, { clientX: 10, clientY: 150 });
        fireEvent.pointerUp(slider, { clientX: 10, clientY: 150 });

        expect(slider).toHaveAttribute('aria-valuenow', '400');
        expect(onSeek).not.toHaveBeenCalled();
    });

    it.each([
        ['ArrowRight', 430],
        ['ArrowUp', 430],
        ['ArrowLeft', 370],
        ['ArrowDown', 370],
        ['Home', 0],
        ['End', MAX],
    ])('seeks with %s', (key, expected) => {
        const { slider, onSeek } = renderSlider();

        fireEvent.keyDown(slider, { key });

        expect(onSeek).toHaveBeenCalledWith(expected);
    });

    it('ignores pointer input when the duration is unknown', () => {
        const onSeek = vi.fn();
        render(
            <ArcSlider
                value={0}
                max={0}
                onSeek={onSeek}
                label="播放進度"
                formatValueText={String}
            />,
        );
        const slider = screen.getByRole('slider');

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10 });
        fireEvent.pointerUp(slider, { clientX: 150, clientY: 10 });

        expect(onSeek).not.toHaveBeenCalled();
    });

    it('ignores keys while the duration is unknown', () => {
        const onSeek = vi.fn();
        render(
            <ArcSlider
                value={100}
                max={0}
                onSeek={onSeek}
                label="播放進度"
                formatValueText={String}
            />,
        );

        fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
        fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

        expect(onSeek).not.toHaveBeenCalled();
    });

    it('keeps its pointer and key events from reaching a surrounding swipe area', () => {
        const parentPointer = vi.fn();
        const parentKey = vi.fn();
        render(
            <div onPointerUp={parentPointer} onPointerDown={parentPointer} onKeyDown={parentKey}>
                <ArcSlider
                    value={400}
                    max={MAX}
                    onSeek={() => {}}
                    label="播放進度"
                    formatValueText={String}
                />
            </div>,
        );
        const slider = screen.getByRole('slider');
        slider.getBoundingClientRect = () =>
            ({ left: 0, top: 0, width: VIEWBOX, height: VIEWBOX }) as DOMRect;

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerUp(slider, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.keyDown(slider, { key: 'ArrowRight' });

        expect(parentPointer).not.toHaveBeenCalled();
        expect(parentKey).not.toHaveBeenCalled();
    });

    it('ignores other keys', () => {
        const { slider, onSeek } = renderSlider();

        fireEvent.keyDown(slider, { key: 'a' });

        expect(onSeek).not.toHaveBeenCalled();
    });
});
