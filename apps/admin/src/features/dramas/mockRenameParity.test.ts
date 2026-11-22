/* S-1394：e2e 假 API（e2e/mockRename.mjs）自己抄咗一份 renamedArcId，同 catalog 嗰份要一模一樣 */
import { renamedArcId } from '@903-player/catalog';
import { renamedArcId as mockRenamedArcId } from '../../../e2e/mockRename.mjs';

const FROM = 'drama-01';
const TO = 'lancy';

const CASES: readonly (readonly [arcId: string, expected: string])[] = [
    ['drama-01-01', 'lancy-01'],
    ['drama-01-12', 'lancy-12'],
    ['drama-01-99', 'lancy-99'],
    ['special', 'special'],
    ['drama-01-extra', 'drama-01-extra'],
    ['drama-01-1', 'drama-01-1'],
    ['drama-01-001', 'drama-01-001'],
    ['drama-01-abc', 'drama-01-abc'],
    ['drama-01x-01', 'drama-01x-01'],
    ['x-drama-01-01', 'x-drama-01-01'],
    ['drama-01', 'drama-01'],
    ['lancy-01', 'lancy-01'],
    ['', ''],
];

describe('e2e mock renamedArcId', () => {
    it.each(CASES)('should rename %s exactly like the catalog rule', (arcId, expected) => {
        expect(renamedArcId(arcId, FROM, TO)).toBe(expected);
        expect(mockRenamedArcId(arcId, FROM, TO)).toBe(expected);
    });
});
