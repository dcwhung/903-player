import { UnauthorizedError } from './client';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
    it('should explain an expired session in Chinese', () => {
        expect(errorMessage(new UnauthorizedError(401, 'not logged in'))).toBe(
            '登入已逾時，請重新登入後再試（未儲存的變更會保留）。',
        );
    });

    it('should pass other errors through', () => {
        expect(errorMessage(new Error('boom'))).toBe('boom');
        expect(errorMessage('x')).toBe('x');
    });
});
