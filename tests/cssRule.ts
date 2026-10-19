// 只畀 Node 環境嘅測試用（*.node.test.ts / scripts/）：tsconfig.node.json 有 Node 型別，
// tsconfig.app.json 排除咗呢個檔，所以 node:fs 唔會漏入 app 程式
import { readFileSync } from 'node:fs';
// postcss 係 Vite 自己嘅依賴（已經喺 node_modules），冇另外加 package
import { parse, type Rule } from 'postcss';

/**
 * 讀 CSS 原文。Vitest 會將 `.module.css?raw` 當 CSS module 處理（返回 class 名 proxy），
 * 攞唔到原文，所以直接由檔案讀。
 */
export const readCss = (url: URL): string => readFileSync(url, 'utf8');

/** 好矮畫面（成頁捲）斷點嘅數值來源係 e2e/run.mjs 嘅 SHORT_HEIGHT_PX；CSS 由測試對返佢 */
export const e2eShortHeightPx = (): number => {
    const runner = readFileSync(new URL('../e2e/run.mjs', import.meta.url), 'utf8');
    return Number(/const SHORT_HEIGHT_PX = (\d+);/.exec(runner)?.[1]);
};

const squash = (text: string): string => text.trim().replace(/\s+/g, ' ');

/** 其他 at-rule（例如 @supports）入面嘅規則：唔當頂層，亦唔當任何 @media */
const OTHER_AT_RULE = '@other';

/** 規則喺邊：頂層係 undefined，@media 入面就係佢嘅條件（例如 `(max-height: 561px)`） */
const contextOf = (rule: Rule): string | undefined => {
    const parent = rule.parent;
    if (parent?.type === 'root') return undefined;
    if (parent?.type === 'atrule' && 'name' in parent && parent.name === 'media') {
        return squash(String(parent.params));
    }
    return OTHER_AT_RULE;
};

/**
 * 喺 CSS 原文搵 selector 完全一樣嘅規則，返回佢嘅宣告（同名後寫蓋前寫）。
 * 唔傳 media 就只睇頂層規則；傳咗就只睇條件完全一樣嘅 @media 入面嗰啲。
 * jsdom 唔會套用 CSS module 嘅樣式，所以 touch-action / overflow 呢類 iOS 手勢關鍵設定要直接讀原文斷言。
 * !important 會留喺值後面，令 toBe('pan-y') 呢類斷言對 `pan-y !important` 失敗（唔准靠 !important 蓋）。
 */
export const cssDeclarations = (
    css: string,
    selector: string,
    media?: string,
): Record<string, string> => {
    const declarations: Record<string, string> = {};
    parse(css).walkRules((rule) => {
        if (squash(rule.selector) !== selector || contextOf(rule) !== media) return;
        rule.each((node) => {
            if (node.type !== 'decl') return;
            const value = squash(node.value);
            declarations[node.prop] = node.important ? `${value} !important` : value;
        });
    });
    return declarations;
};

/** CSS 入面所有 @media 嘅 max-height 斷點（px） */
export const maxHeightBreakpoints = (css: string): number[] => {
    const breakpoints: number[] = [];
    parse(css).walkAtRules('media', (atRule) => {
        for (const match of atRule.params.matchAll(/max-height:\s*(\d+)px/g)) {
            breakpoints.push(Number(match[1]));
        }
    });
    return breakpoints;
};
