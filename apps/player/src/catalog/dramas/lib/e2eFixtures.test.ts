/* e2e 測試劇（e2e/fixtures/dramas）：驗得過 schema、借到圖，同 e2e/comingSoon.mjs 假設嘅狀態一致 */
import { buildRegistry } from '@903-player/catalog';
import { bundledSource } from './bundledSource';
import { E2E_FIXTURES_KEY, withE2EFixtures } from './e2eFixtures';

/** e2e/harness.mjs E2E_NOW 嘅香港日子 */
const E2E_TODAY = '2026-11-30';
const FIXTURES = ['e2e-gone', 'e2e-leaving', 'e2e-soon', 'e2e-upcoming'];

describe('e2e drama fixtures', () => {
    afterEach(() => localStorage.clear());

    it('should leave the catalog alone without the e2e flag', () => {
        const ids = withE2EFixtures(bundledSource)
            .folders()
            .map((f) => f.id);
        expect(ids.some((id) => id.startsWith('e2e-'))).toBe(false);
    });

    it('should add valid fixtures with borrowed images once the flag is set', () => {
        localStorage.setItem(E2E_FIXTURES_KEY, '1');
        const registry = buildRegistry(withE2EFixtures(bundledSource));

        expect(FIXTURES.map((id) => registry.dramaStatus(id, E2E_TODAY))).toEqual([
            'removed',
            'live',
            'live',
            'upcoming',
        ]);
        expect(registry.findDrama('e2e-upcoming')?.tileArt).toBe(
            registry.findDrama('c18')?.tileArt,
        );
    });
});
