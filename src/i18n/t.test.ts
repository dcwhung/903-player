import { t } from './t';

describe('t', () => {
    it('returns the message for a key', () => {
        expect(t('home.today')).toBe('今日節目');
    });

    it('fills in parameters', () => {
        expect(t('app.version', { version: '1.2.3' })).toBe('v1.2.3');
    });
});
