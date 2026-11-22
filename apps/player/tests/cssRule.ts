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

/** e2e 嘅橫版最細闊度（LANDSCAPE_MIN_WIDTH_PX），由測試對返 src/config/layout.ts */
export const e2eLandscapeMinWidthPx = (): number => {
    const runner = readFileSync(new URL('../e2e/run.mjs', import.meta.url), 'utf8');
    return Number(/const LANDSCAPE_MIN_WIDTH_PX = (\d+);/.exec(runner)?.[1]);
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

/** CSS 入面所有 @media 嘅條件（空白壓成一格），按出現次序 */
export const mediaQueries = (css: string): string[] => {
    const queries: string[] = [];
    parse(css).walkAtRules('media', (atRule) => {
        queries.push(squash(atRule.params));
    });
    return queries;
};

/**
 * iPhone Duo / HomeView 嘅裝置範圍 query（P10，src/config/layout.ts）一定有闊度上限（max-width），
 * 係「某部機」唔係「矮螢幕」：唔當高度斷點（寫法由 deviceQueries.node.test.ts 鎖住）
 */
const isDeviceRange = (query: string): boolean => query.includes('max-width');

/** CSS 入面所有 @media 嘅 max-height 斷點（px）；excludeLandscape 就唔計橫版（orientation: landscape）嘅 */
export const maxHeightBreakpoints = (css: string, { excludeLandscape = false } = {}): number[] =>
    mediaQueries(css)
        .filter((query) => !isDeviceRange(query))
        .filter((query) => !(excludeLandscape && query.includes('orientation: landscape')))
        .flatMap((query) =>
            [...query.matchAll(/max-height:\s*(\d+)px/g)].map((match) => Number(match[1])),
        );

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

const REDUCED_MOTION_CONTEXT = '@media (prefers-reduced-motion: reduce)';
const NO_PREFERENCE = 'prefers-reduced-motion: no-preference';
const MOTION_FAMILIES = ['transition', 'animation'] as const;
type MotionFamily = (typeof MOTION_FAMILIES)[number];

/** 自己開唔到動畫嘅 longhand（要有 name / property + duration 先郁）：唔當動態 */
const NOT_MOTION_SUFFIXES: readonly string[] = [
    '-play-state',
    '-timing-function',
    '-delay',
    '-fill-mode',
    '-direction',
    '-iteration-count',
    '-composition',
    '-behavior',
];

/** 屬性係邊類動態（transition* / animation*）；唔係、或者自己開唔到動畫嘅 longhand 就 undefined */
const motionFamilyOf = (prop: string): MotionFamily | undefined => {
    const family = MOTION_FAMILIES.find((name) => prop === name || prop.startsWith(`${name}-`));
    if (family === undefined) return undefined;
    return NOT_MOTION_SUFFIXES.some((suffix) => prop === `${family}${suffix}`) ? undefined : family;
};

const isZeroTime = (value: string): boolean => /^0(s|ms)?$/.test(value.trim());

/**
 * 呢個值係咪熄咗動態：shorthand / -property / -name 以 none 開頭（`none`、`none 0s`），
 * 或者 -duration 全部係 0
 */
const isMotionOff = (prop: string, value: string): boolean =>
    prop.endsWith('-duration') ? value.split(',').every(isZeroTime) : /^none\b/.test(value);

interface MotionDeclaration {
    selector: string;
    prop: string;
    family: MotionFamily;
    off: boolean;
}

/** 規則入面嘅動態宣告，每個 selector 一條 */
const motionDeclarations = (rule: Rule): MotionDeclaration[] => {
    const found: MotionDeclaration[] = [];
    rule.each((node) => {
        if (node.type !== 'decl') return;
        const family = motionFamilyOf(node.prop);
        if (family === undefined) return;
        const off = isMotionOff(node.prop, squash(node.value));
        for (const selector of rule.selectors) {
            found.push({ selector: squash(selector), prop: node.prop, family, off });
        }
    });
    return found;
};

const offKey = ({ selector, family }: MotionDeclaration): string => `${selector} { ${family} }`;

/**
 * 減少動態時仲會郁嘅規則，寫成 `selector { prop }`（prop = 開動畫嗰個屬性，例如 transition / animation-name）。
 *
 * 呢個係逐個檔自己揀用嘅檢查（冇全 repo 測試），唔係通用 cascade matcher。當熄咗嘅條件：
 * 頂層 `@media (prefers-reduced-motion: reduce)` 入面，有 selector **完全一樣**、**寫喺動畫規則後面**嘅規則，
 * 將同一類動態（transition* 或者 animation*）熄咗：shorthand / -property / -name 以 none 開頭，或者 -duration 係 0。
 * selector 一樣 specificity 就一樣，後寫先一定贏；只寫 `.player` 熄唔到 `.player[data-pressing='true']`
 *（0,2,0 贏 0,1,0），jsdom 又睇唔到 cascade，所以直接讀原文。
 * 寫喺 `prefers-reduced-motion: no-preference` 入面嘅本身已經唔會出現，唔計；
 * 自己開唔到動畫嘅 longhand（-play-state、-timing-function、-delay 等）亦唔計。
 *
 * 已知會誤報（實際熄到、但呢度照樣列出）嘅寫法，用呢個 helper 嘅檔要避開：
 * - reduce block 用 specificity 一樣或者更高、但寫法唔同嘅 selector，例如 ShowCardStack 用
 *   `.stack[data-phase] .card` 熄 `.stack[data-phase='settling'] .card`
 * - reduce block 包喺另一個 @media 入面，或者同其他條件寫埋一齊（`… and (prefers-reduced-motion: reduce)`）
 * - 布林寫法 `@media (prefers-reduced-motion)`
 * - 靠 `!important`、或者喺其他位將 duration token 設做 0 嚟熄
 */
export const motionLeftOnWhenReduced = (css: string): string[] => {
    const rules: Rule[] = [];
    parse(css).walkRules((rule) => {
        rules.push(rule);
    });
    // 每條 selector + 動態類別最後一次喺 reduce block 熄咗嘅位置（文件次序）
    const switchedOffAt = new Map<string, number>();
    rules.forEach((rule, index) => {
        if (contextOf(rule) !== REDUCED_MOTION_CONTEXT) return;
        for (const declaration of motionDeclarations(rule)) {
            if (declaration.off) switchedOffAt.set(offKey(declaration), index);
        }
    });
    const left: string[] = [];
    rules.forEach((rule, index) => {
        const context = contextOf(rule);
        if (context === REDUCED_MOTION_CONTEXT || context?.includes(NO_PREFERENCE)) return;
        for (const declaration of motionDeclarations(rule)) {
            if (declaration.off) continue;
            // 後寫先贏：reduce block 寫喺前面就熄唔到
            if ((switchedOffAt.get(offKey(declaration)) ?? -1) > index) continue;
            left.push(`${declaration.selector} { ${declaration.prop} }`);
        }
    });
    return left;
};
