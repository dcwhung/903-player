// @vitest-environment node
// e2e/harness.mjs 嘅 runSection：一個 section throw（例如 waitFor 超時）要 log FAIL 再行落去，
// 唔可以令成個 e2e 中止、冇結尾總結。用網址動態 import（同 e2eSrcConstants.test.ts 一樣，唔使 allowJs）
type Log = (ok: boolean, msg: string) => void;
type RunSection = (log: Log, label: string, run: () => Promise<unknown>) => Promise<boolean>;

const loadRunSection = async (): Promise<RunSection> => {
    const harness = (await import(
        /* @vite-ignore */ new URL('../e2e/harness.mjs', import.meta.url).href
    )) as { runSection: RunSection };
    return harness.runSection;
};

describe('e2e runSection', () => {
    it('should run the section and not log anything itself when it finishes', async () => {
        const runSection = await loadRunSection();
        const log = vi.fn<Log>();
        const run = vi.fn(async () => undefined);

        const ok = await runSection(log, '主頁', run);

        expect(ok).toBe(true);
        expect(run).toHaveBeenCalledTimes(1);
        expect(log).not.toHaveBeenCalled();
    });

    it('should log one FAIL with the label and error when the section throws', async () => {
        const runSection = await loadRunSection();
        const log = vi.fn<Log>();

        const ok = await runSection(log, '橫版主頁', async () => {
            throw new Error('locator.waitFor: Timeout 5000ms exceeded.');
        });

        expect(ok).toBe(false);
        expect(log).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith(
            false,
            expect.stringMatching(/橫版主頁.*Timeout 5000ms exceeded/),
        );
    });

    it('should keep only the first line of a multi-line Playwright error', async () => {
        const runSection = await loadRunSection();
        const log = vi.fn<Log>();

        await runSection(log, 'x', async () => {
            throw new Error('Timeout 5000ms exceeded.\nCall log:\n  - waiting for locator');
        });

        expect(log.mock.lastCall?.[1]).not.toContain('Call log');
    });

    it('should report non-Error throws too', async () => {
        const runSection = await loadRunSection();
        const log = vi.fn<Log>();

        await runSection(log, 'x', () => Promise.reject('boom'));

        expect(log).toHaveBeenCalledWith(false, expect.stringContaining('boom'));
    });
});
