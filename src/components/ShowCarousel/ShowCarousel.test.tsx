import { fireEvent, render, screen } from '@testing-library/react';
import { PageDots } from '../PageDots/PageDots';
import { ShowCarousel } from './ShowCarousel';

const ARTS = ['/a.jpg', '/b.jpg', '/c.jpg'];

const setup = (index = 1) => {
    const onChange = vi.fn();
    const onInnerClick = vi.fn();
    render(
        <ShowCarousel arts={ARTS} index={index} onChange={onChange}>
            <button type="button" onClick={onInnerClick}>
                內容
            </button>
        </ShowCarousel>,
    );
    return {
        group: screen.getByRole('group', { name: '今日節目，左右掃動轉節目' }),
        inner: screen.getByRole('button', { name: '內容' }),
        onChange,
        onInnerClick,
    };
};

describe('ShowCarousel', () => {
    it('peeks at the previous and next shows', () => {
        const { group } = setup();

        expect([...group.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
            '/a.jpg',
            '/c.jpg',
        ]);
    });

    it('moves to the next show on a left swipe and the previous on a right swipe', () => {
        const { group, onChange } = setup();

        fireEvent.pointerDown(group, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(group, { clientX: 200, clientY: 105 });
        fireEvent.pointerDown(group, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(group, { clientX: 220, clientY: 100 });

        expect(onChange).toHaveBeenNthCalledWith(1, 2);
        expect(onChange).toHaveBeenNthCalledWith(2, 0);
    });

    it('does not wrap past either end', () => {
        const { group, onChange } = setup(2);

        fireEvent.pointerDown(group, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(group, { clientX: 100, clientY: 100 });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores taps and vertical drags', () => {
        const { group, onChange } = setup();

        fireEvent.pointerDown(group, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(group, { clientX: 104, clientY: 100 });
        fireEvent.pointerDown(group, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(group, { clientX: 40, clientY: 300 });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('swallows the click that follows a swipe over an inner button', () => {
        const { inner, onChange, onInnerClick } = setup();

        fireEvent.pointerDown(inner, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 150, clientY: 100 });
        fireEvent.click(inner, { detail: 1 }); // 滑鼠 click

        expect(onChange).toHaveBeenCalledWith(2);
        expect(onInnerClick).not.toHaveBeenCalled();
    });

    it('lets a plain click on an inner button through, also right after a swipe', () => {
        const { inner, onInnerClick } = setup();

        fireEvent.pointerDown(inner, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 150, clientY: 100 });
        fireEvent.click(inner, { detail: 1 }); // 滑鼠 click
        fireEvent.pointerDown(inner, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 101, clientY: 100 });
        fireEvent.click(inner, { detail: 1 }); // 滑鼠 click

        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('lets a keyboard click through after a touch swipe that sent no click', () => {
        const { inner, onChange, onInnerClick } = setup();

        fireEvent.pointerDown(inner, { pointerType: 'touch', clientX: 300, clientY: 100 });
        fireEvent.pointerUp(inner, { pointerType: 'touch', clientX: 180, clientY: 100 });
        fireEvent.click(inner, { detail: 0 });

        expect(onChange).toHaveBeenCalledWith(2);
        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('ignores arrow keys meant for inner buttons and sliders', () => {
        const { inner, onChange } = setup();
        render(
            <ShowCarousel arts={ARTS} index={1} onChange={onChange}>
                <div role="slider" aria-valuenow={0} tabIndex={0} aria-label="進度" />
            </ShowCarousel>,
        );

        fireEvent.keyDown(inner, { key: 'ArrowRight' });
        fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('reacts to arrow keys on the dots', () => {
        const onChange = vi.fn();
        render(
            <ShowCarousel arts={ARTS} index={1} onChange={onChange}>
                <PageDots keys={ARTS} labels={['甲', '乙', '丙']} index={1} onSelect={() => {}} />
            </ShowCarousel>,
        );

        fireEvent.keyDown(screen.getByRole('button', { name: '乙' }), { key: 'ArrowRight' });

        expect(onChange).toHaveBeenCalledWith(2);
    });

    it('can be focused itself', () => {
        const { group } = setup();

        expect(group).toHaveAttribute('tabindex', '0');
    });

    it('supports the arrow keys', () => {
        const { group, onChange } = setup();

        fireEvent.keyDown(group, { key: 'ArrowRight' });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });

        expect(onChange).toHaveBeenNthCalledWith(1, 2);
        expect(onChange).toHaveBeenNthCalledWith(2, 0);
    });
});
