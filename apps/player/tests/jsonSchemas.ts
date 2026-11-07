// 只畀 Node 環境嘅測試用（*.node.test.ts / scripts/）：tsconfig.node.json 有 Node 型別，
// tsconfig.app.json 排除咗呢個檔，所以 node:fs 同 ajv 唔會漏入 app 程式
import { readFileSync } from 'node:fs';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = new URL('../', import.meta.url);

/** schemas/ 入面有嘅 JSON Schema */
export type SchemaName = 'drama' | 'show';

/**
 * 用 ajv 編譯 schemas/<name>.schema.json。schema drift test 同 dramaFromFolder CLI test 共用，
 * 兩邊用同一套 ajv 設定，唔會一邊收一邊拒。
 */
export const compileSchema = (name: SchemaName): ValidateFunction => {
    // strict：schema 有打錯嘅 keyword 即刻 throw；union type（string | null）係刻意用；
    // if/then 入面 required 嘅欄位喺上層 properties 已定義，所以關 strictRequired
    const ajv = new Ajv({
        allErrors: true,
        strict: true,
        strictRequired: false,
        allowUnionTypes: true,
    });
    addFormats(ajv, ['date']);
    // color-hex 只係畀 VS Code 出色盤；真正規則喺 pattern，所以 ajv 呢度唔使再驗
    ajv.addFormat('color-hex', true);
    const schema: unknown = JSON.parse(
        readFileSync(new URL(`schemas/${name}.schema.json`, ROOT), 'utf8'),
    );
    return ajv.compile(schema as object);
};
