// @vitest-environment node
import type * as Catalog from '@903-player/catalog';
import type { CatalogText } from '@903-player/catalog';
import indexHtml from '../index.html?raw';
import {
    applyBrandingText,
    DEFAULT_APP_NAME,
    injectBrandingText,
    loadBranding,
    manifestText,
} from './brandingConfig';

const TEXT: CatalogText = {
    name: '新城電台',
    shortName: '新城',
    description: '新城電台：節目與音樂，隨時收聽。',
};

const contentOf = (html: string, marker: string): string | undefined =>
    html
        .match(/<meta\b[^>]*>/g)
        ?.find((tag) => tag.includes(marker))
        ?.match(/content="([^"]*)"/)?.[1];

describe('manifestText', () => {
    it('should use the catalog name, short name and description', () => {
        expect(manifestText(TEXT)).toEqual({
            name: '新城電台',
            short_name: '新城',
            description: '新城電台：節目與音樂，隨時收聽。',
        });
    });

    it('should fall back to the name when there is no short name', () => {
        expect(manifestText({ name: '新城電台', description: 'x' }).short_name).toBe('新城電台');
    });

    it('should keep the built-in name and no description without branding', () => {
        expect(manifestText(undefined)).toEqual({
            name: DEFAULT_APP_NAME,
            short_name: DEFAULT_APP_NAME,
        });
    });
});

describe('applyBrandingText', () => {
    const out = applyBrandingText(indexHtml, TEXT);

    it('should set the title, description and og tags from the catalog', () => {
        expect(out).toContain('<title>新城電台</title>');
        expect(contentOf(out, 'name="description"')).toBe(TEXT.description);
        expect(contentOf(out, 'property="og:title"')).toBe(TEXT.name);
        expect(contentOf(out, 'property="og:site_name"')).toBe(TEXT.name);
        expect(contentOf(out, 'property="og:description"')).toBe(TEXT.description);
    });

    it('should not touch the stable og tags', () => {
        expect(contentOf(out, 'property="og:type"')).toBe('website');
        expect(contentOf(out, 'property="og:locale"')).toBe('zh_HK');
    });

    it('should HTML-escape the catalog values', () => {
        const html = applyBrandingText(indexHtml, {
            name: 'A & <B> "C"',
            description: 'd & e',
        });
        expect(html).toContain('<title>A &amp; &lt;B&gt; &quot;C&quot;</title>');
        expect(html).toContain('content="A &amp; &lt;B&gt; &quot;C&quot;"');
        expect(html).not.toContain('<title>A & <B>');
    });

    // W-736：String.replace 嘅 replacement 字串會解讀 $' / $& / $1，App 名有 $ 都要原樣寫入（& 照 escape）
    it('should write $ patterns in the catalog values literally', () => {
        const html = applyBrandingText(indexHtml, {
            name: "A$'B$&C$1",
            description: 'D$&E$`F$$G',
        });
        const name = "A$'B$&amp;C$1";
        const description = 'D$&amp;E$`F$$G';
        expect(html).toContain(`<title>${name}</title>`);
        expect(contentOf(html, 'property="og:title"')).toBe(name);
        expect(contentOf(html, 'name="description"')).toBe(description);
        expect(contentOf(html, 'property="og:description"')).toBe(description);
        expect(html.match(/<\/html>/g)).toHaveLength(1);
    });
});

describe('injectBrandingText', () => {
    const transform = (plugin: ReturnType<typeof injectBrandingText>) => {
        const hook = plugin.transformIndexHtml;
        const handler = typeof hook === 'function' ? hook : hook?.handler;
        return (handler as (html: string) => string)(indexHtml);
    };

    it('should rewrite the html when branding text is present', () => {
        expect(transform(injectBrandingText(TEXT))).toContain('<title>新城電台</title>');
    });

    it('should leave the html untouched without branding text', () => {
        expect(transform(injectBrandingText(undefined))).toBe(indexHtml);
    });
});

describe('loadBranding', () => {
    const DOC = { schemaVersion: 1, generatedAt: 'now', shows: [], dramas: [] };
    const catalog = {
        parseCatalogDocument: vi.fn((v: unknown) => v as Catalog.CatalogDocument),
    };
    const url = 'https://api.example/catalog/v1/catalog.json';

    const fetchJson = (body: unknown, status = 200) =>
        vi.fn(async () => new Response(JSON.stringify(body), { status }));

    const run = (over: Record<string, unknown> = {}, fetchImpl?: typeof fetch) =>
        loadBranding({
            url,
            command: 'build',
            mode: 'production',
            loadCatalog: async () => catalog,
            fetchImpl: fetchImpl ?? fetchJson({ ...DOC, branding: { text: TEXT } }),
            ...over,
        });

    it('should read branding from the published catalog', async () => {
        await expect(run()).resolves.toEqual({ text: TEXT });
    });

    it.each([
        ['serve', { command: 'serve' }],
        ['e2e', { mode: 'e2e' }],
        ['no url', { url: '' }],
    ])('should skip fetching for %s', async (_name, over) => {
        const fetchImpl = fetchJson({ ...DOC, branding: { text: TEXT } });
        await expect(run(over, fetchImpl)).resolves.toBeUndefined();
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('should warn and return undefined when the fetch fails', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await expect(run({}, fetchJson('nope', 404))).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });
});
