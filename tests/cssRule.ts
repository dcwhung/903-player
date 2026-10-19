// 只畀 Node 環境嘅測試用（*.node.test.ts / scripts/）：tsconfig.node.json 有 Node 型別，
// tsconfig.app.json 排除咗呢個檔，所以 node:fs 唔會漏入 app 程式
import { readFileSync } from 'node:fs';

/**
 * 讀 CSS 原文。Vitest 會將 `.module.css?raw` 當 CSS module 處理（返回 class 名 proxy），
 * 攞唔到原文，所以直接由檔案讀。
 */
export const readCss = (url: URL): string => readFileSync(url, 'utf8');

/**
 * 喺 CSS 原文入面搵頂層、selector 完全一樣嘅規則，返回佢嘅宣告。
 * jsdom 唔會套用 CSS module 嘅樣式，所以 touch-action / overflow 呢類 iOS 手勢關鍵設定
 * 要直接讀原文斷言。@media 入面嘅規則唔計（只睇預設版面）。
 */
export const cssDeclarations = (css: string, selector: string): Record<string, string> => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const declarations: Record<string, string> = {};
    let depth = 0;
    let start = 0;
    for (let i = 0; i < withoutComments.length; i += 1) {
        const char = withoutComments[i];
        if (char === '{') {
            if (depth === 0) {
                const head = withoutComments.slice(start, i).trim().replace(/\s+/g, ' ');
                const end = withoutComments.indexOf('}', i);
                if (head === selector)
                    Object.assign(declarations, parseBody(withoutComments.slice(i + 1, end)));
            }
            depth += 1;
        } else if (char === '}') {
            depth -= 1;
            if (depth === 0) start = i + 1;
        }
    }
    return declarations;
};

const parseBody = (body: string): Record<string, string> =>
    Object.fromEntries(
        body
            .split(';')
            .map((part) => part.split(':'))
            .filter((pair): pair is [string, ...string[]] => pair.length > 1)
            .map(([name, ...value]) => [name.trim(), value.join(':').trim().replace(/\s+/g, ' ')]),
    );
