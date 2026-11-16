// @vitest-environment node
import { readFileSync } from 'node:fs';

/*
 * S-1015（S-567 guard，由已刪嘅 dramaFromFolder.test.ts 搬過嚟，簡化做讀 config）：
 * vite/client 型別（import.meta.env、?raw）只畀 scripts/*.test.ts（tsconfig.scripts-test.json）；
 * tsconfig.node.json 底下純 Node 檔（vite.config.ts、scripts/*.ts）唔可以有，用 import.meta.env 要報錯
 */
const VITE_CLIENT = 'vite/client';
const SCRIPT_TESTS = 'scripts/*.test.ts';

interface TsConfig {
    compilerOptions?: { types?: string[] };
    include?: string[];
    exclude?: string[];
    references?: { path: string }[];
}

const readConfig = (name: string): TsConfig =>
    JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')) as TsConfig;

describe('tsconfig type isolation', () => {
    it('should keep vite/client types out of tsconfig.node.json', () => {
        const node = readConfig('tsconfig.node.json');
        expect(node.compilerOptions?.types ?? []).not.toContain(VITE_CLIENT);
        expect(node.exclude ?? []).toContain(SCRIPT_TESTS);
    });

    it('should give only the script tests vite/client types', () => {
        const scriptsTest = readConfig('tsconfig.scripts-test.json');
        expect(scriptsTest.compilerOptions?.types ?? []).toContain(VITE_CLIENT);
        expect(scriptsTest.include).toEqual([SCRIPT_TESTS]);
    });

    it('should reference both configs from tsconfig.json', () => {
        const paths = (readConfig('tsconfig.json').references ?? []).map((r) => r.path);
        expect(paths).toEqual(
            expect.arrayContaining(['./tsconfig.node.json', './tsconfig.scripts-test.json']),
        );
    });
});
