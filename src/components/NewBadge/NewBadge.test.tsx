import { render, screen } from '@testing-library/react';
import { NewBadge } from './NewBadge';

describe('NewBadge', () => {
    it('shows 新 as a decorative pill (the owner reads it out)', () => {
        render(<NewBadge />);
        const badge = screen.getByText('新');
        expect(badge).toHaveAttribute('aria-hidden', 'true');
    });

    it('takes a compact size for chips', () => {
        render(<NewBadge size="sm" className="extra" />);
        expect(screen.getByText('新').className).toMatch(/sm/);
        expect(screen.getByText('新').className).toMatch(/extra/);
    });
});
