import { render, screen } from '@testing-library/react';
import { hasIcon } from '../../tests/icons';
import { mockApi } from '../../tests/renderApp';
import { AuthGate } from './AuthGate';

describe('AuthGate', () => {
    it('should show a refresh icon on 重試 when /api/me fails', async () => {
        mockApi({ 'GET /api/me': () => ({ status: 500, body: { error: 'boom' } }) });
        render(<AuthGate>{() => <p>in</p>}</AuthGate>);
        const retry = await screen.findByRole('button', { name: '重試' });
        expect(hasIcon(retry, 'refresh-cw')).toBe(true);
    });
});
