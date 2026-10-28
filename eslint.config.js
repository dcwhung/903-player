import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// AU-010 尺寸上限：.ts 函數 / .tsx component / .tsx 檔案行數
const TS_FN_MAX_LINES = 30;
const TSX_FN_MAX_LINES = 50;
const TSX_FILE_MAX_LINES = 150;
// 空行同註解都計（同 audit AST 量度一致）
const SIZE_LINES = { skipBlankLines: false, skipComments: false };

export default tseslint.config(
    // .claude/**：agent worktree（.claude/worktrees/）各有 tsconfig，會令 typescript-eslint 搵到多個 tsconfig root
    { ignores: ['dist', 'coverage', '.claude/**'] },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'no-magic-numbers': 'off',
            // 底線開頭嘅參數係刻意唔用（例如 memo invalidation key）
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        // .ts（含 hook / service）：函數 ≤ 30 行，冇檔案上限
        files: ['src/**/*.ts'],
        ignores: ['**/*.test.ts'], // 已包 *.node.test.ts
        rules: {
            'max-lines-per-function': ['error', { max: TS_FN_MAX_LINES, ...SIZE_LINES }],
        },
    },
    {
        // .tsx 主要係 component：函數 ≤ 50 行，檔案 ≤ 150 行
        files: ['src/**/*.tsx'],
        ignores: ['**/*.test.tsx'],
        rules: {
            'max-lines-per-function': ['error', { max: TSX_FN_MAX_LINES, ...SIZE_LINES }],
            'max-lines': ['error', { max: TSX_FILE_MAX_LINES, ...SIZE_LINES }],
        },
    },
    {
        // 預留：.ts 而家冇 max-lines（hook / service 唔限檔案行數），呢個 block 暫時係 no-op；
        // 將來如果幫 .ts 加 max-lines，資料檔照樣豁免（函數上限照用）
        files: ['src/i18n/zh-HK.ts', 'src/dramas/schema.ts', 'src/dramas/registry.ts'],
        rules: { 'max-lines': 'off' },
    },
    {
        // 雙保險：上面 src block 已 ignore test 檔，e2e / scripts 亦唔喺 src/** glob；
        // 保留呢個 block 確保將來改 glob 時 test / e2e / scripts 照樣唔受尺寸限制
        files: ['**/*.test.{ts,tsx}', 'e2e/**', 'scripts/**'],
        rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
    },
);
