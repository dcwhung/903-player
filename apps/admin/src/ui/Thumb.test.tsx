import { render } from '@testing-library/react';
import { Thumb } from './Thumb';

describe('Thumb', () => {
    it('should show the player default black disc when there is no image', () => {
        const { container } = render(<Thumb url={undefined} />);
        expect(container.firstChild).toHaveClass('thumb', 'blank');
    });

    it('should not blank a banner tile or a disc with an image', () => {
        const tile = render(<Thumb url={undefined} tile />);
        expect(tile.container.firstChild).not.toHaveClass('blank');
        const disc = render(<Thumb url="/x.webp" size="xs" />);
        expect(disc.container.firstChild).toHaveClass('xs');
        expect(disc.container.firstChild).not.toHaveClass('blank');
    });
});
