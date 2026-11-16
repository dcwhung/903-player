// @vitest-environment node
// 要用 tests/jsonSchemas（node:fs 讀 schemas/）：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { compileSchema } from '../../tests/jsonSchemas';
import { generateDraft } from './draft';
import { episodeFile, listingOf, range } from './testListing';
import type { DraftResult } from './types';

/*
 * S-1017：掃描草稿要過 drama.schema.json（admin 編輯 / VS Code 見到嘅規則，嚴過 runtime）。
 * 由已刪嘅 CLI test 搬過嚟（佢逐份草稿都驗 schema）；runtime 規則喺 draft.test.ts 經 parseDramaDefinition 驗
 */
const TODAY = '2026-10-29';
const dramaSchema = compileSchema('drama');

const expectSchemaValid = (result: DraftResult): void => {
    expect(result.json).not.toBeNull();
    const valid = dramaSchema(result.json);
    expect(dramaSchema.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
};

describe('generateDraft — drafts match drama.schema.json', () => {
    it('should accept a new series draft with firstNo 0, titles and covers', () => {
        const DRAMA = '測試劇場';
        const files = [
            ...range(1, 3).map((n) => episodeFile('森之愛情II - 電燈膽', n)),
            ...range(0, 1).map((n) => episodeFile('初戀', n, n ? '' : '前傳')),
            ...range(1, 2).map((n) => episodeFile('Ｘ時mas', n, 'A _ B')),
        ];
        const listing = listingOf(DRAMA, [...files, 'cover photo.png', '初戀/cover-photo.jpg']);
        expectSchemaValid(generateDraft(listing, { id: 'test', today: TODAY }));
    });

    it('should accept files overrides when the filename arc label differs from the folder', () => {
        const paths = range(1, 2).map((n) => episodeFile('森之愛情II', n, '', '森之愛情Ⅱ'));
        const result = generateDraft(listingOf('劇', paths), { id: 'test', today: TODAY });
        expect(JSON.stringify(result.json)).toContain('"files"');
        expectSchemaValid(result);
    });

    it('should accept a new daily draft', () => {
        const listing = listingOf('每日劇', ['20261022.m4a', '20261023.m4a', 'cover photo.jpg']);
        expectSchemaValid(generateDraft(listing, { id: 'daily', today: TODAY }));
    });
});
