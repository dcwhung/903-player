// @vitest-environment node
// S-1149：e2e/harness.mjs 嘅 newE2EContext 預設時區香港。月亮掣跟裝置本地 21:00–05:00，
// 唔固定就跟跑嘅機（CI 係 UTC，E2E_NOW 22:30 +08:00 變 14:30，月亮掣唔出）。
// 用網址動態 import（同 e2eSection.test.ts 一樣，唔使 allowJs）
type ContextOptions = Record<string, unknown>;

interface FakeContext {
    on: () => void;
    route: () => Promise<void>;
    addInitScript: () => Promise<void>;
    clock: { install: () => Promise<void> };
}

interface Harness {
    newE2EContext: (
        browser: { newContext: (options: ContextOptions) => Promise<FakeContext> },
        options?: ContextOptions,
    ) => Promise<FakeContext>;
    E2E_TIMEZONE: string;
}

interface VisualModel {
    VISUAL_TIMEZONE: string;
}

const importE2E = <T>(file: string): Promise<T> =>
    import(/* @vite-ignore */ new URL(`../e2e/${file}`, import.meta.url).href) as Promise<T>;

const fakeBrowser = () => {
    const seen: ContextOptions[] = [];
    const ctx: FakeContext = {
        on: () => undefined,
        route: async () => undefined,
        addInitScript: async () => undefined,
        clock: { install: async () => undefined },
    };
    return {
        seen,
        browser: {
            newContext: async (options: ContextOptions) => {
                seen.push(options);
                return ctx;
            },
        },
    };
};

describe('e2e context timezone', () => {
    it('should default every e2e context to the same timezone as the screenshot diff', async () => {
        const harness = await importE2E<Harness>('harness.mjs');
        const visual = await importE2E<VisualModel>('visualModel.mjs');
        const { seen, browser } = fakeBrowser();

        await harness.newE2EContext(browser, { viewport: { width: 390, height: 844 } });

        expect(harness.E2E_TIMEZONE).toBe('Asia/Hong_Kong');
        expect(visual.VISUAL_TIMEZONE).toBe(harness.E2E_TIMEZONE);
        expect(seen[0]).toMatchObject({ timezoneId: 'Asia/Hong_Kong' });
    });

    it('should let a section override the timezone', async () => {
        const harness = await importE2E<Harness>('harness.mjs');
        const { seen, browser } = fakeBrowser();

        await harness.newE2EContext(browser, { timezoneId: 'UTC' });

        expect(seen[0]).toMatchObject({ timezoneId: 'UTC' });
    });
});
