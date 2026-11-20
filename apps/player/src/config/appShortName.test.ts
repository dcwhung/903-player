import { APP_SHORT_NAME } from './appShortName';

describe('appShortName', () => {
    // 測試冇 catalog branding：同 scripts/brandingConfig.ts DEFAULT_APP_NAME（刻意寫死做獨立對照）
    it('should use the default app name when no catalog branding is set', () => {
        expect(APP_SHORT_NAME).toBe('903 Player');
    });
});
