import { render } from '@testing-library/react';
import { Disc } from './Disc';

describe('Disc', () => {
    it('is decorative, sized by prop and shows the show artwork', () => {
        const { container } = render(<Disc size="small" art="/art/gongzi.jpg" />);
        const disc = container.firstElementChild as HTMLElement;

        expect(disc).toHaveAttribute('aria-hidden', 'true');
        expect(disc.className).toMatch(/small/);
        expect(disc.querySelector('img')).toHaveAttribute('src', '/art/gongzi.jpg');
    });

    it('should spin a small disc face when spinning', () => {
        const { container } = render(<Disc size="small" spinning />);

        expect(container.querySelector('.face')?.className).toMatch(/spinning/);
    });

    it('should not spin a small disc face by default', () => {
        const { container } = render(<Disc size="small" />);

        expect(container.querySelector('.face')?.className).not.toMatch(/spinning/);
    });

    it('renders without artwork', () => {
        const { container } = render(<Disc />);

        expect(container.querySelector('img')).toBeNull();
    });
});
