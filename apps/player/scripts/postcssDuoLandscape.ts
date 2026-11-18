/*
 * PostCSS plugin（P10，iPhone Duo）：Duo 闔上・橫 / Standing / Seated（612px 闊）窄過 LANDSCAPE_QUERY 嘅 640px，
 * 本來出直版。用戶要佢行手機打橫版面，但現有裝置嘅顯示一定唔可以變，所以唔改斷點、唔改 source：
 * build 時將每個「橫版」同「手機打橫」@media 區塊原封不動複製一份，條件換成 DUO_COVER_LANDSCAPE_QUERY，
 * 緊跟喺原本嗰份後面（cascade 次序同原本一樣）。兩句條件嘅闊度範圍唔重疊（≥ 640 對 600–639），
 * 複製品喺現有裝置永遠唔生效。闊橫版（WIDE_BANNER_QUERY，高 ≥ 562）同大畫面變體唔複製：Duo 闔上・橫高 ≤ 450。
 */
import type { AtRule, Plugin } from 'postcss';
import {
    DUO_COVER_LANDSCAPE_QUERY,
    LANDSCAPE_QUERY,
    SHORT_LANDSCAPE_QUERY,
} from '../src/config/layout.ts';

const CLONED_QUERIES: ReadonlySet<string> = new Set([LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY]);

const normalize = (params: string): string => params.replace(/\s+/g, ' ').trim();

/**
 * 下一個 node 已經係呢份嘅複製品（同一個檔行第二次）：條件係 Duo、內容都一模一樣先算。
 * 只睇條件唔夠：原本嗰份後面緊接人手寫嘅 Duo 區塊（內容唔同）就會靜靜雞唔複製（S-1115）
 */
const alreadyCloned = (rule: AtRule, clone: AtRule): boolean => {
    const next = rule.next();
    return (
        next?.type === 'atrule' &&
        next.name === 'media' &&
        normalize(next.params) === DUO_COVER_LANDSCAPE_QUERY &&
        next.nodes?.toString() === clone.nodes?.toString()
    );
};

export const duoLandscape = (): Plugin => ({
    postcssPlugin: 'duo-landscape',
    AtRule: {
        media: (rule) => {
            if (!CLONED_QUERIES.has(normalize(rule.params))) return;
            const clone = rule.clone({ params: DUO_COVER_LANDSCAPE_QUERY });
            if (!alreadyCloned(rule, clone)) rule.after(clone);
        },
    },
});
