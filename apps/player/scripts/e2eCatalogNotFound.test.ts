import type { PreviewServer } from 'vite';
import { e2eCatalogNotFound } from './e2eCatalogNotFound';

type Middleware = (req: unknown, res: { statusCode: number; end: () => void }) => void;

const install = (catalogUrl: string) => {
    const use = vi.fn<(path: string, handler: Middleware) => void>();
    const plugin = e2eCatalogNotFound(catalogUrl);
    const hook = plugin.configurePreviewServer;
    const handler = typeof hook === 'function' ? hook : hook?.handler;
    void handler?.call({} as never, { middlewares: { use } } as unknown as PreviewServer);
    return use;
};

describe('e2eCatalogNotFound', () => {
    it('should answer 404 for everything under the catalog folder', () => {
        const use = install('/903-player/e2e-catalog/catalog.json');
        expect(use).toHaveBeenCalledWith('/903-player/e2e-catalog/', expect.any(Function));
        const res = { statusCode: 200, end: vi.fn() };
        const [, middleware] = use.mock.calls[0] ?? [];
        middleware?.({}, res);
        expect(res.statusCode).toBe(404);
        expect(res.end).toHaveBeenCalled();
    });
});
