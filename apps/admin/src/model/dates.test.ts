import { zhHK } from '../i18n/zh-HK';
import { clockTime, longDate, shortDate, stampOf } from './dates';

describe('dates', () => {
    // S-841：admin 文案一律「今日」（用戶確認嘅字眼），唔再混用「今天」
    it('should never say 今天 in the admin strings', () => {
        expect(JSON.stringify(zhHK)).not.toContain('今天');
    });

    // 用戶 2026-11-11：admin 日期一律「日/月」（唔用「月/日」）
    it('should format a short date as day/month with the weekday', () => {
        expect(shortDate('2026-11-16')).toBe('16/11 一');
        expect(shortDate('2026-10-27')).toBe('27/10 二');
        expect(shortDate('2026-11-22')).toBe('22/11 日');
    });

    it('should not build month/day anywhere in the admin strings', () => {
        expect(JSON.stringify(zhHK)).not.toMatch(/\{month\}\/\{day\}/);
    });

    it('should format a long date', () => {
        expect(longDate('2026-11-03')).toBe('11 月 3 日');
    });

    it('should show HK clock time for an ISO timestamp', () => {
        expect(clockTime('2026-11-10T01:41:00.000Z')).toBe('09:41');
    });

    it('should stamp today as 今日 and other days as D/M', () => {
        const now = new Date('2026-11-10T04:00:00.000Z');
        expect(stampOf('2026-11-10T02:02:00.000Z', now)).toBe('今日 10:02');
        expect(stampOf('2026-11-09T14:40:00.000Z', now)).toBe('9/11 22:40');
        expect(stampOf('2025-12-31T14:40:00.000Z', now)).toBe('31/12/2025 22:40');
    });
});
