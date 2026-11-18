/*
 * PostCSS plugin（P10，iPhone Duo / HomeView）：新裝置要重用現有某個版面，但現有裝置嘅顯示一定唔可以變，
 * 所以唔改斷點、唔改 source 規則：build 時將現有 @media 區塊原封不動複製一份，條件換成新裝置嘅範圍，
 * 緊跟喺原本嗰份後面（cascade 次序同原本一樣）。新範圍同原本條件唔重疊，複製品喺現有裝置永遠唔生效。
 *
 * 1. Duo 闔上・橫 / Standing / Seated（612px 闊）窄過 LANDSCAPE_QUERY 嘅 640px，本來出直版：
 *    每個「橫版」同「手機打橫」區塊都複製去 DUO_COVER_LANDSCAPE_QUERY（闊度 600–639 對 ≥ 640）。
 *    闊橫版（WIDE_BANNER_QUERY，高 ≥ 562）同大畫面變體唔複製：Duo 闔上・橫高 ≤ 450。
 * 2. HomeView（544×544，SQUARE_QUERY）主頁用闊橫版嘅播放卡（HomeWide），但佢唔係橫向：
 *    只複製前面寫咗 SQUARE_CLONE_MARKER 註解嘅闊橫版區塊（例如集數清單闊行），其他闊橫版規則
 *    （內頁兩欄、把手預留位等）唔帶過去。
 */
import type { AtRule, Comment, Plugin } from 'postcss';
import {
    DUO_COVER_LANDSCAPE_QUERY,
    LANDSCAPE_QUERY,
    SHORT_LANDSCAPE_QUERY,
    SQUARE_QUERY,
    WIDE_BANNER_QUERY,
} from '../src/config/layout.ts';

/** 寫喺闊橫版 @media 前面嘅註解入面：呢段 HomeView 都要（build 時複製去 SQUARE_QUERY） */
export const SQUARE_CLONE_MARKER = '@square-clone';

const DUO_SOURCES: ReadonlySet<string> = new Set([LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY]);

const normalize = (params: string): string => params.replace(/\s+/g, ' ').trim();

/** 緊貼喺前面嘅係咪記號註解 */
const markedForSquare = (rule: AtRule): boolean => {
    const prev = rule.prev();
    return prev?.type === 'comment' && (prev as Comment).text.includes(SQUARE_CLONE_MARKER);
};

/** 呢段要複製去邊個範圍；唔使複製就冇 */
const targetOf = (rule: AtRule): string | undefined => {
    const params = normalize(rule.params);
    if (DUO_SOURCES.has(params)) return DUO_COVER_LANDSCAPE_QUERY;
    if (params === WIDE_BANNER_QUERY && markedForSquare(rule)) return SQUARE_QUERY;
    return undefined;
};

/**
 * 下一個 node 已經係呢份嘅複製品（同一個檔行第二次）：條件一樣、內容都一模一樣先算。
 * 只睇條件唔夠：原本嗰份後面緊接人手寫嘅同條件區塊（內容唔同）就會靜靜雞唔複製（S-1115）
 */
const alreadyCloned = (after: AtRule, clone: AtRule): boolean => {
    const next = after.next();
    return (
        next?.type === 'atrule' &&
        next.name === 'media' &&
        normalize(next.params) === clone.params &&
        next.nodes?.toString() === clone.nodes?.toString()
    );
};

export const duoLandscape = (): Plugin => ({
    postcssPlugin: 'duo-landscape',
    AtRule: {
        media: (rule) => {
            const target = targetOf(rule);
            if (!target) return;
            const clone = rule.clone({ params: target });
            if (!alreadyCloned(rule, clone)) rule.after(clone);
        },
    },
});
