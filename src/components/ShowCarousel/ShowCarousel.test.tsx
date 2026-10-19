import { fireEvent, render, screen } from '@testing-library/react';
import { ShowCarousel } from './ShowCarousel';

const ARTS = ['/a.jpg', '/b.jpg', '/c.jpg'];

const setup = (index = 1) => {
    const onChange = vi.fn();
    render(
        <ShowCarousel arts={ARTS} index={index} onChange={onChange}>
            <button type="button">內容</button>
        </ShowCarousel>,
    );
    return { group: screen.getByRole('group', { name: '今日節目，左右掃動轉節目' }), onChange };
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

    it('supports the arrow keys', () => {
        const { group, onChange } = setup();

        fireEvent.keyDown(group, { key: 'ArrowRight' });
        fireEvent.keyDown(group, { key: 'ArrowLeft' });

        expect(onChange).toHaveBeenNthCalledWith(1, 2);
        expect(onChange).toHaveBeenNthCalledWith(2, 0);
    });
});
