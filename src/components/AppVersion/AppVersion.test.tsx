import { render, screen } from '@testing-library/react';
import { AppVersion } from './AppVersion';

describe('AppVersion', () => {
    it('should show the formatted version when given a version', () => {
        render(<AppVersion version="0.2.0" />);

        expect(screen.getByText('v0.2.0')).toBeInTheDocument();
    });

    it('should give screen readers a spoken label when rendered', () => {
        render(<AppVersion version="0.2.0" />);

        expect(screen.getByText('版本 0.2.0')).toBeInTheDocument();
        expect(screen.getByText('v0.2.0')).toHaveAttribute('aria-hidden', 'true');
    });
});
