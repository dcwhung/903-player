import { render, screen } from '@testing-library/react';
import apiPackage from '../../../api/package.json';
import { Brand } from './Brand';

describe('Brand', () => {
    it('should show the api package version in the admin pill', () => {
        render(<Brand />);
        expect(screen.getByText(`Admin v${apiPackage.version}`)).toBeInTheDocument();
    });
});
