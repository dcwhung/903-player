import { render, screen } from '@testing-library/react';
import adminPackage from '../../package.json';
import { Brand } from './Brand';

describe('Brand', () => {
    it('should show the admin package version in the admin pill', () => {
        render(<Brand />);
        expect(screen.getByText(`Admin v${adminPackage.version}`)).toBeInTheDocument();
    });
});
