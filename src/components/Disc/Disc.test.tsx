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

    // 冇圖：用中性黑碟（.blank），唔跟頁面主題色（CUI-0006）
    it('renders without artwork as the blank black disc', () => {
        const { container } = render(<Disc />);

        expect(container.querySelector('img')).toBeNull();
        expect(container.firstElementChild?.className).toMatch(/\bblank\b/);
    });

    it('does not mark a disc with artwork as blank', () => {
        const { container } = render(<Disc art="/art/gongzi.jpg" />);

        expect(container.firstElementChild?.className).not.toMatch(/\bblank\b/);
    });
});
