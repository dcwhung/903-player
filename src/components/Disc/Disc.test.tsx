import { render } from '@testing-library/react';
import { Disc } from './Disc';

describe('Disc', () => {
    it('is decorative and sized by prop', () => {
        const { container } = render(<Disc size="small" />);
        const disc = container.firstElementChild as HTMLElement;

        expect(disc).toHaveAttribute('aria-hidden', 'true');
        expect(disc.className).toMatch(/small/);
    });
});
