// 只畀 Node 環境嘅測試用（*.node.test.ts / scripts/）：tsconfig.node.json 有 Node 型別，
// tsconfig.app.json 排除咗呢個檔，所以 node:fs 唔會漏入 app 程式
import { readFileSync } from 'node:fs';
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

/**
 * 規則喺邊：頂層係 undefined，否則係由外至內嘅 at-rule prelude 用空格連埋，空白壓成一格，例如
 * `@media (max-height: 561px)`、`@supports (height: 1cqh)`，
 * 或者 @media 入面再包 @supports 就係 `@media (max-height: 561px) @supports (height: 1cqh)`。
 */
const contextOf = (rule: Rule): string | undefined => {
    const preludes: string[] = [];
    for (let node = rule.parent; node && node.type !== 'root'; node = node.parent) {
        if (node.type === 'atrule' && 'name' in node) {
            preludes.unshift(`@${String(node.name)} ${String(node.params)}`);
        }
    }
    return preludes.length === 0 ? undefined : squash(preludes.join(' '));
};

/** 逐個宣告行過 selector 完全一樣、直屬 context（undefined = 頂層）嘅規則；!important 留喺值後面 */
const eachDeclaration = (
    css: string,
    selector: string,
    context: string | undefined,
    visit: (prop: string, value: string) => void,
) => {
    parse(css).walkRules((rule) => {
        if (squash(rule.selector) !== selector || contextOf(rule) !== context) return;
        rule.each((node) => {
            if (node.type !== 'decl') return;
            const value = squash(node.value);
            visit(node.prop, node.important ? `${value} !important` : value);
        });
    });
};

const mediaContext = (media?: string): string | undefined =>
    media === undefined ? undefined : squash(`@media ${media}`);

/** 同名後寫蓋前寫 */
const collect = (
    css: string,
    selector: string,
    context: string | undefined,
): Record<string, string> => {
    const declarations: Record<string, string> = {};
    eachDeclaration(css, selector, context, (prop, value) => {
        declarations[prop] = value;
    });
    return declarations;
};

/**
 * 喺 CSS 原文搵 selector 完全一樣嘅規則，返回佢嘅宣告（同名後寫蓋前寫）。
 * 唔傳 media 就只睇頂層規則；傳咗（例如 `(max-height: 561px)`）就只睇條件一樣嘅 @media 入面嗰啲。
 * jsdom 唔會套用 CSS module 嘅樣式，所以 touch-action / overflow 呢類 iOS 手勢關鍵設定要直接讀原文斷言。
 * !important 會留喺值後面，令 toBe('pan-y') 呢類斷言對 `pan-y !important` 失敗（唔准靠 !important 蓋）。
 */
export const cssDeclarations = (
    css: string,
    selector: string,
    media?: string,
): Record<string, string> => collect(css, selector, mediaContext(media));

/**
 * 任何 at-rule 入面嘅宣告：prelude 寫齊 `@名 條件`（空白唔計），例如
 * `atRuleDeclarations(css, '@supports (height: 1cqh)', '.shell')`，
 * 或者 `atRuleDeclarations(css, '@media (max-height: 561px)', '.stack')`（等於 cssDeclarations 傳 media）。
 * 要成條 at-rule 鏈一樣先計：包喺第二個 at-rule 入面就要寫埋外層，例如
 * `'@media (max-height: 561px) @supports (height: 1cqh)'`。同名後寫蓋前寫，!important 留喺值後面。
 */
export const atRuleDeclarations = (
    css: string,
    prelude: string,
    selector: string,
): Record<string, string> => collect(css, selector, squash(prelude));

/** 喺某條 at-rule 鏈（同 atRuleDeclarations 一樣寫法）入面嘅所有 selector，按出現次序 */
export const atRuleSelectors = (css: string, prelude: string): string[] => {
    const selectors: string[] = [];
    parse(css).walkRules((rule) => {
        if (contextOf(rule) === squash(prelude)) selectors.push(squash(rule.selector));
    });
    return selectors;
};

/**
 * 同一條規則入面某個屬性嘅全部值（按寫嘅次序）：用嚟斷言後備鏈，例如
 * `touch-action: none; touch-action: pinch-zoom;`（唔識後者嘅瀏覽器留喺前者）。
 */
export const cssValues = (
    css: string,
    selector: string,
    prop: string,
    media?: string,
): string[] => {
    const values: string[] = [];
    eachDeclaration(css, selector, mediaContext(media), (name, value) => {
        if (name === prop) values.push(value);
    });
    return values;
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

export interface CssDeclaration {
    /** 同 contextOf 一樣：頂層係 undefined，否則係由外至內嘅 at-rule 鏈 */
    context: string | undefined;
    selector: string;
    prop: string;
    value: string;
}

/**
 * 某條 at-rule 鏈（同 atRuleDeclarations 一樣寫法）以外嘅所有規則宣告：頂層同其他 at-rule 入面嘅都計，
 * 嗰條鏈入面再包嘅 at-rule 當係入面。用嚟斷言某啲值（例如 dvh）只可以喺 fallback 出現。
 * at-rule 本身嘅條件（例如 `@supports (height: 100dvh)`）唔係宣告，唔會返回。
 */
export const declarationsOutside = (css: string, prelude: string): CssDeclaration[] => {
    const excluded = squash(prelude);
    const found: CssDeclaration[] = [];
    parse(css).walkRules((rule) => {
        const context = contextOf(rule);
        if (context === excluded || context?.startsWith(`${excluded} `)) return;
        rule.each((node) => {
            if (node.type !== 'decl') return;
            found.push({
                context,
                selector: squash(rule.selector),
                prop: node.prop,
                value: squash(node.value),
            });
        });
    });
    return found;
};
