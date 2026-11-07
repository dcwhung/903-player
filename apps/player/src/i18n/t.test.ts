import { t } from './t';

describe('t', () => {
    it('returns the message for a key', () => {
        expect(t('home.today')).toBe('今日節目');
    });

    it('fills in parameters', () => {
        expect(t('app.version', { version: '1.2.3' })).toBe('v1.2.3');
    });

    // S-717：分隔符唔寫死喺字典，{sep} 預設由 common.separator 填；讀屏句可以傳「，」蓋過
    it('should fill {sep} with common.separator unless given', () => {
        expect(t('episodes.countWithUnavailable', { count: 5, unavailable: 2 })).toBe(
            '共 5 集 · 2 集未上架',
        );
        expect(t('drama.seriesLabelUntitled', { arc: '三十六計', no: 1, sep: '，' })).toBe(
            '三十六計，第 1 集',
        );
    });
});
