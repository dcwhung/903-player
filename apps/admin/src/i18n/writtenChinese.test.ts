import { zhHK } from './zh-HK';

/*
 * Admin 介面文字一律書面語（用戶 2026-11-13 決定，見 .claude/CLAUDE.md「Admin 介面文字」）：
 * 掃晒 zh-HK.ts 每一句，見到廣東話口語字就 fail
 */
const COLLOQUIAL = /[嘅咗唔喺嚟啲佢冇睇嗰咁啱俾嘢揾搵乜咩撳㗎囉嘞噉]/u;

const strings = (value: unknown, path: string): [string, string][] => {
    if (typeof value === 'string') return [[path, value]];
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
    return [];
};

describe('admin copy', () => {
    it('should use written Chinese only (no Cantonese colloquial characters)', () => {
        const colloquial = strings(zhHK, 'zhHK').filter(([, text]) => COLLOQUIAL.test(text));
        expect(colloquial).toEqual([]);
    });
});
