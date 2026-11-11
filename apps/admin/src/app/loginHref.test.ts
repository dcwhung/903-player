import { loginHref } from './loginHref';

const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('loginHref (S-809: come back to the deep link after login)', () => {
    it('should start a plain login from the home page', () => {
        expect(loginHref(at('/'))).toBe('/auth/google/start');
    });

    it('should pass the deep link (path, query, hash) as ?next=', () => {
        expect(loginHref(at('/dramas/lancy/schedule', '', '#lancy-02'))).toBe(
            '/auth/google/start?next=%2Fdramas%2Flancy%2Fschedule%23lancy-02',
        );
        expect(loginHref(at('/history', '?page=2'))).toBe(
            '/auth/google/start?next=%2Fhistory%3Fpage%3D2',
        );
    });

    it('should only send same-origin relative paths', () => {
        expect(loginHref(at('//evil.example/x'))).toBe('/auth/google/start');
        expect(loginHref(at('/\\evil.example'))).toBe('/auth/google/start');
        expect(loginHref(at('/auth/google/start'))).toBe('/auth/google/start');
        expect(loginHref(at('/dramas\n/x'))).toBe('/auth/google/start');
    });
});
