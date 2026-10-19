import { t } from './t';

describe('t', () => {
    it('returns the message for a key', () => {
        expect(t('home.today')).toBe('今日節目');
    });

    it('fills in parameters', () => {
        expect(t('player.seekBack', { seconds: 30 })).toBe('後退 30 秒');
    });
});
