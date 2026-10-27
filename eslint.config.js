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
    { ignores: ['dist', 'coverage'] },
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
        ignores: ['**/*.test.ts', '**/*.node.test.ts'],
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
        // 資料檔豁免：只豁免檔案行數，函數上限照用
        files: ['src/i18n/zh-HK.ts', 'src/dramas/schema.ts', 'src/dramas/registry.ts'],
        rules: { 'max-lines': 'off' },
    },
    {
        // test / e2e / scripts：describe / it callback 天生長，唔受限
        files: ['**/*.test.{ts,tsx}', 'e2e/**', 'scripts/**'],
        rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
    },
);
