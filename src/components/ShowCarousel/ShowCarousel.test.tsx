import { fireEvent, render, screen } from '@testing-library/react';
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
        fireEvent.click(inner);

        expect(onChange).toHaveBeenCalledWith(2);
        expect(onInnerClick).not.toHaveBeenCalled();
    });

    it('lets a plain click on an inner button through, also right after a swipe', () => {
        const { inner, onInnerClick } = setup();

        fireEvent.pointerDown(inner, { clientX: 300, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 150, clientY: 100 });
        fireEvent.click(inner);
        fireEvent.pointerDown(inner, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(inner, { clientX: 101, clientY: 100 });
        fireEvent.click(inner);

        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('supports the arrow keys', () => {
        const { group, onChange } = setup();

        fireEvent.keyDown(group, { key: 'ArrowRight' });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });

        expect(onChange).toHaveBeenNthCalledWith(1, 2);
        expect(onChange).toHaveBeenNthCalledWith(2, 0);
    });
});
