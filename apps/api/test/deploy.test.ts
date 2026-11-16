/*
 * Publish 改咗 branding → 觸發重新部署 player（GitHub repository_dispatch + Vercel Deploy Hook）、
 * 部署狀態（GitHub Actions deploy.yml run）、重新部署。外部 fetch 全部 mock（vi.spyOn globalThis.fetch）
 */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest, call, loginCookie, ORIGIN } from './helpers';
import { drama, putEntry, seed } from './fixtures';

const TOKEN = 'github-test-token';
const HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_test/hook';
const DISPATCH_URL = 'https://api.github.com/repos/dcwhung/903-player/dispatches';
const RUNS_URL =
    'https://api.github.com/repos/dcwhung/903-player/actions/workflows/deploy.yml/runs';
const RUN_URL = 'https://github.com/dcwhung/903-player/actions/runs/42';

/** typeof env：同 env 一樣型別（secret 選填），default 參數先可以傳返 env */
const WITH_SECRETS: typeof env = {
    ...env,
    GITHUB_DEPLOY_TOKEN: TOKEN,
    VERCEL_DEPLOY_HOOK_URL: HOOK,
};
const TEXT = { name: '903 Player', description: '節目重溫' };

interface Deployed {
    id: number;
    deploy: 'none' | 'triggered' | 'skipped' | 'failed';
    deployRequestedAt: string | null;
}

type Responder = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

/** 外部 fetch mock：記低每次 call，按 responder 回應 */
const mockFetch = (responder: Responder = () => new Response(null, { status: 204 })) => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        calls.push({ url, init });
        return responder(url, init);
    });
    return calls;
};

const putText = () => adminRequest('PUT', '/api/branding/text', { body: TEXT });

const publish = async (bindings = WITH_SECRETS): Promise<Deployed> => {
    const response = await adminPost('/api/publish', bindings);
    expect(response.status).toBe(200);
    return ((await response.json()) as { publish: Deployed }).publish;
};

const catalogWritten = async () => (await env.CATALOG.head('catalog/v1/catalog.json')) !== null;

afterEach(() => vi.restoreAllMocks());

describe('POST /api/publish deploy trigger', () => {
    beforeEach(() => seed(3));

    it('should not deploy when branding did not change', async () => {
        const calls = mockFetch();
        expect(await publish()).toMatchObject({ deploy: 'none', deployRequestedAt: null });
        expect(calls).toEqual([]);
    });

    it('should record skipped (and call nothing) when neither secret is set', async () => {
        const calls = mockFetch();
        await putText();
        const row = await publish(env);
        expect(row.deploy).toBe('skipped');
        expect(calls).toEqual([]);
        expect(await catalogWritten()).toBe(true);
    });

    it('should dispatch to GitHub and call the Vercel hook when branding changed', async () => {
        const calls = mockFetch();
        await putText();
        const row = await publish();
        expect(row.deploy).toBe('triggered');
        expect(Date.parse(row.deployRequestedAt ?? '')).not.toBeNaN();
        expect(calls.map((c) => [c.url, c.init?.method])).toEqual([
            [DISPATCH_URL, 'POST'],
            [HOOK, 'POST'],
        ]);
        const github = calls[0]?.init;
        expect(new Headers(github?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
        expect(new Headers(github?.headers).get('accept')).toBe('application/vnd.github+json');
        expect(new Headers(github?.headers).get('user-agent')).toBe('903-player-api');
        expect(JSON.parse(String(github?.body))).toEqual({
            event_type: 'catalog-branding',
            client_payload: { publishId: row.id },
        });
    });

    it('should trigger with only the Vercel hook set', async () => {
        const calls = mockFetch();
        await putText();
        const row = await publish({ ...env, VERCEL_DEPLOY_HOOK_URL: HOOK });
        expect(row.deploy).toBe('triggered');
        expect(calls.map((c) => c.url)).toEqual([HOOK]);
    });

    it.each<[string, Responder]>([
        ['GitHub answers 401', (url) => new Response('{}', { status: url === HOOK ? 201 : 401 })],
        [
            'the network fails',
            () => {
                throw new TypeError('network down');
            },
        ],
    ])('should still publish and record failed when %s', async (_label, responder) => {
        mockFetch(responder);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await putText();
        const row = await publish();
        expect(row.deploy).toBe('failed');
        expect(await catalogWritten()).toBe(true);
        const history = (await (await adminGet('/api/publishes')).json()) as {
            publishes: Deployed[];
        };
        expect(history.publishes[0]).toMatchObject({ deploy: 'failed', id: row.id });
    });
});

/*
 * S-966：還原 #N 唔還原舊 branding（照用 D1 而家嘅值，同 banner 一樣），所以觸發與否只睇
 * D1 branding 同上一次 ok publish 比有冇唔同（apps/api/README.md「Publish / 還原」）
 */
describe('POST /api/publishes/:id/rollback deploy trigger', () => {
    beforeEach(() => seed(3));

    const rollback = async (id: number) => {
        const response = await adminPost(`/api/publishes/${id}/rollback`, WITH_SECRETS);
        expect(response.status).toBe(200);
        return (await response.json()) as { publish?: Deployed & { rollbackOf: number | null } };
    };

    const publishedText = async () => {
        const object = await env.CATALOG.get('catalog/v1/catalog.json');
        return (JSON.parse((await object?.text()) ?? '{}') as { branding?: { text?: unknown } })
            .branding?.text;
    };

    it('should deploy when the current D1 branding differs from the last publish', async () => {
        mockFetch();
        await publish(); // #1：冇 branding
        await putText();
        const calls = mockFetch();
        const { publish: row } = await rollback(1);
        expect(row).toMatchObject({ rollbackOf: 1, deploy: 'triggered' });
        expect(calls.map((c) => c.url)).toEqual([DISPATCH_URL, HOOK]);
        // #1 冇 branding，但還原照用 D1 而家嘅 branding
        expect(await publishedText()).toEqual(TEXT);
    });

    it('should not deploy (nor restore the old branding) when D1 branding is as last published', async () => {
        mockFetch();
        await publish(); // #1：冇 branding
        await putText();
        await putEntry('dramas', 'golden', { ...drama(3), enabled: false });
        expect((await publish()).deploy).toBe('triggered'); // #2：有 branding、golden 下架
        const calls = mockFetch();
        const { publish: row } = await rollback(1);
        expect(row).toMatchObject({ rollbackOf: 1, deploy: 'none', deployRequestedAt: null });
        expect(calls).toEqual([]);
        expect(await publishedText()).toEqual(TEXT);
    });
});

describe('GET /api/publishes/:id/deploy', () => {
    beforeEach(() => seed(3));

    const status = async (id: number | string, bindings = WITH_SECRETS) => {
        const response = await adminGet(`/api/publishes/${id}/deploy`, bindings);
        return { code: response.status, body: (await response.json()) as Record<string, unknown> };
    };

    const runsResponse = (runs: unknown[]) =>
        Response.json({ total_count: runs.length, workflow_runs: runs });

    /** 先 publish 一次觸發部署，之後 fetch 改回 runs */
    const triggered = async (runs: Responder) => {
        mockFetch();
        await putText();
        const row = await publish();
        vi.restoreAllMocks();
        return { row, calls: mockFetch(runs) };
    };

    it.each<[string, Record<string, unknown>, string]>([
        ['queued', { status: 'queued', conclusion: null }, 'queued'],
        ['in progress', { status: 'in_progress', conclusion: null }, 'in_progress'],
        ['successful', { status: 'completed', conclusion: 'success' }, 'success'],
        ['failed', { status: 'completed', conclusion: 'failure' }, 'failure'],
        ['cancelled', { status: 'completed', conclusion: 'cancelled' }, 'failure'],
    ])('should map a %s run', async (_label, run, expected) => {
        const { row } = await triggered(() => runsResponse([{ ...run, html_url: RUN_URL }]));
        expect(await status(row.id)).toEqual({
            code: 200,
            body: { status: expected, url: RUN_URL },
        });
    });

    it('should ask GitHub for repository_dispatch runs created since the request', async () => {
        const { row, calls } = await triggered(() => runsResponse([]));
        expect((await status(row.id)).body).toEqual({ status: 'queued', url: null });
        const url = new URL(calls[0]?.url ?? '');
        expect(`${url.origin}${url.pathname}`).toBe(RUNS_URL);
        expect(url.searchParams.get('event')).toBe('repository_dispatch');
        const since = (row.deployRequestedAt ?? '').slice(0, 19);
        expect(url.searchParams.get('created')).toBe(`>=${since}Z`);
        expect(new Headers(calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
    });

    it('should pick the oldest run since the request (newest first from GitHub)', async () => {
        const { row } = await triggered(() =>
            runsResponse([
                { status: 'queued', conclusion: null, html_url: `${RUN_URL}3` },
                { status: 'completed', conclusion: 'success', html_url: RUN_URL },
            ]),
        );
        expect((await status(row.id)).body).toEqual({ status: 'success', url: RUN_URL });
    });

    it('should answer unknown without a token, without a deploy, or when GitHub fails', async () => {
        const { row } = await triggered(() => new Response('{}', { status: 500 }));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect((await status(row.id)).body).toEqual({ status: 'unknown', url: null });
        expect((await status(row.id, env)).body).toEqual({ status: 'unknown', url: null });
        await adminRequest('DELETE', '/api/branding/text');
        await env.DB.prepare("UPDATE publishes SET deploy = 'none'").run();
        expect((await status(row.id)).body).toEqual({ status: 'unknown', url: null });
    });

    it('should answer failure when the dispatch itself failed', async () => {
        mockFetch(() => new Response('{}', { status: 422 }));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await putText();
        const row = await publish();
        expect((await status(row.id)).body).toEqual({ status: 'failure', url: null });
    });

    it('should answer 404 for a publish that does not exist', async () => {
        expect((await status(99)).code).toBe(404);
        expect((await status('x')).code).toBe(404);
    });
});

describe('POST /api/publishes/:id/deploy', () => {
    beforeEach(() => seed(3));

    const redeploy = async (id: number | string, bindings = WITH_SECRETS) =>
        call(
            `/api/publishes/${id}/deploy`,
            { method: 'POST', headers: { cookie: await loginCookie(), origin: ORIGIN } },
            bindings,
        );

    it('should dispatch again and record the new request time', async () => {
        const row = await publish(env);
        const calls = mockFetch();
        const response = await redeploy(row.id);
        expect(response.status).toBe(200);
        const body = (await response.json()) as Pick<Deployed, 'deploy' | 'deployRequestedAt'>;
        expect(body.deploy).toBe('triggered');
        expect(calls.map((c) => c.url)).toEqual([DISPATCH_URL, HOOK]);
        const history = (await (await adminGet('/api/publishes')).json()) as {
            publishes: Deployed[];
        };
        expect(history.publishes[0]).toMatchObject({
            deploy: 'triggered',
            deployRequestedAt: body.deployRequestedAt,
        });
    });

    it('should record skipped when no secret is set', async () => {
        const row = await publish(env);
        const response = await redeploy(row.id, env);
        expect(((await response.json()) as Deployed).deploy).toBe('skipped');
    });

    it('should answer 404 for a missing publish and 403 cross-origin', async () => {
        expect((await redeploy(99)).status).toBe(404);
        const cross = await adminRequest('POST', '/api/publishes/1/deploy', {
            headers: { origin: 'https://evil.example' },
        });
        expect(cross.status).toBe(403);
    });
});
