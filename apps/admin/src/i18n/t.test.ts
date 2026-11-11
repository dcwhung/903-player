import { t } from './t';

describe('t', () => {
    it('should fill {params} and keep unknown placeholders', () => {
        expect(t('app.version', { version: '0.4.0' })).toBe('Admin v0.4.0');
        expect(t('app.version')).toBe('Admin v{version}');
    });
});
