import { render } from '@testing-library/react';
import { Separator } from './Separator';

describe('Separator', () => {
    it('should render common.separator hidden from screen readers (G2)', () => {
        const { container } = render(<Separator />);
        const span = container.querySelector('span');
        expect(span?.textContent).toBe(' · ');
        expect(span).toHaveAttribute('aria-hidden', 'true');
    });

    it('should add the caller class when given', () => {
        const { container } = render(<Separator className="x" />);
        expect(container.querySelector('span')).toHaveClass('x');
    });
});
