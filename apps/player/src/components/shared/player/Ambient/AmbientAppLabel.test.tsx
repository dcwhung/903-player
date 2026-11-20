import { render } from '@testing-library/react';
import { AmbientAppLabel } from './AmbientAppLabel';

describe('AmbientAppLabel', () => {
    it('should show the apple touch icon and the app short name', () => {
        const { container } = render(<AmbientAppLabel />);

        const label = container.querySelector('[data-ambient-label]');
        expect(label).toHaveTextContent('903 Player');
        const icon = label?.querySelector('img');
        expect(icon).toHaveAttribute('src', `${import.meta.env.BASE_URL}apple-touch-icon.png`);
        // 名已經係文字：icon 係裝飾
        expect(icon).toHaveAttribute('alt', '');
    });

    it('should be hidden from screen readers when shown (the dialog is already labelled)', () => {
        const { container } = render(<AmbientAppLabel />);

        expect(container.querySelector('[data-ambient-label]')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });
});
