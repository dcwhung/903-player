import { render } from '@testing-library/react';
import { PlayIcon } from './icons';

describe('icons', () => {
    it('should size the icon from --ui-scale so landscape screens can enlarge it', () => {
        const { container } = render(<PlayIcon size={22} />);

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '22');
        expect(svg?.style.width).toBe('calc(22px * var(--ui-scale, 1))');
        expect(svg?.style.height).toBe('calc(22px * var(--ui-scale, 1))');
    });
});
