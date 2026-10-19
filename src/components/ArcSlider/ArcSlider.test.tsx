import { fireEvent, render, screen } from '@testing-library/react';
import { ArcSlider } from './ArcSlider';

const MAX = 1000;
const VIEWBOX = 300;

const renderSlider = (value = 400) => {
    const onSeek = vi.fn();
    render(
        <ArcSlider
            value={value}
            max={MAX}
            onSeek={onSeek}
            label="播放進度"
            formatValueText={(seconds) => `v${Math.round(seconds)}`}
        />,
    );
    const slider = screen.getByRole('slider', { name: '播放進度' });
    slider.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: VIEWBOX, height: VIEWBOX }) as DOMRect;
    return { slider, onSeek };
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

    it('ignores other keys', () => {
        const { slider, onSeek } = renderSlider();

        fireEvent.keyDown(slider, { key: 'a' });

        expect(onSeek).not.toHaveBeenCalled();
    });
});
