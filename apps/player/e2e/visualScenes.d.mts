/*
 * visualScenes.mjs 嘅型別（只畀 repo 入面嘅 TypeScript test 用）。
 * ctx / page 係 Playwright 嘅 BrowserContext / Page；test 唔會行 seed / run，所以唔引 Playwright 型別。
 */
export interface VisualScene {
    id: string;
    /** 時鐘起點（ISO）；冇就用 harness E2E_NOW */
    now?: string;
    seed?: (ctx: unknown, base: string) => Promise<unknown>;
    run: (page: unknown, base: string) => Promise<unknown>;
}

export const VISUAL_SCENES: readonly VisualScene[];
