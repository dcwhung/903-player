// @vitest-environment node
// W-713：admin SPA 由 Workers static assets 出（唔經 Worker 嘅 denyFraming），要靠 public/_headers 擋 iframe
import { existsSync, readFileSync } from 'node:fs';

const HEADERS_FILE = new URL('../../public/_headers', import.meta.url);

describe('admin static asset headers (_headers)', () => {
    it('should forbid framing on every path', () => {
        expect(existsSync(HEADERS_FILE)).toBe(true);
        const text = readFileSync(HEADERS_FILE, 'utf8');
        expect(text).toMatch(/^\/\*\s*$/m);
        expect(text).toMatch(/^\s+X-Frame-Options: DENY\s*$/m);
        expect(text).toMatch(/^\s+Content-Security-Policy: frame-ancestors 'none'\s*$/m);
    });
});
