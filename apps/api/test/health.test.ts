import { env } from 'cloudflare:test';
import worker from '../src/index';
import pkg from '../package.json';

describe('GET /api/health', () => {
    it('should answer without a session and report the api version', async () => {
        const response = await worker.fetch(new Request('https://api.test/api/health'), env);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true, version: pkg.version });
    });
});
