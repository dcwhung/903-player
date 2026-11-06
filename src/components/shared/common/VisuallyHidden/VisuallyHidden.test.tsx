import { render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
    it('should keep the text for screen readers with one shared hidden class (S-724)', () => {
        render(<VisuallyHidden>向左滑動移除</VisuallyHidden>);

        const text = screen.getByText('向左滑動移除');
        expect(text.tagName).toBe('SPAN');
        expect(text).not.toHaveAttribute('aria-hidden');
        expect(text.className).not.toBe('');
    });

    it('should pass the id through so aria-describedby can point at it', () => {
        render(<VisuallyHidden id="hint">提示</VisuallyHidden>);

        expect(screen.getByText('提示')).toHaveAttribute('id', 'hint');
    });
});
