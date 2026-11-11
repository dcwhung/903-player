import {
    ApiError,
    PublishBlockedError,
    UnauthorizedError,
    ValidationError,
    VersionConflictError,
    request,
} from './client';

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    vi.fn(() =>
        Promise.resolve(
            new Response(body === null ? null : JSON.stringify(body), {
                status,
                headers: { 'content-type': 'application/json', ...headers },
            }),
        ),
    );

describe('request', () => {
    it('should send same-origin credentials and JSON body, returning data + ETag', async () => {
        const fetchMock = respond(200, { ok: true }, { etag: '"2026-11-10T00:00:00.000Z"' });
        vi.stubGlobal('fetch', fetchMock);
        const result = await request('/api/entries/shows/waves', {
            method: 'PUT',
            body: { definition: {}, images: {} },
            ifMatch: '"v1"',
        });
        expect(result).toEqual({ data: { ok: true }, etag: '"2026-11-10T00:00:00.000Z"' });
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('/api/entries/shows/waves');
        expect(init.credentials).toBe('same-origin');
        expect(new Headers(init.headers).get('if-match')).toBe('"v1"');
        expect(new Headers(init.headers).get('content-type')).toBe('application/json');
        expect(init.body).toBe('{"definition":{},"images":{}}');
    });

    it('should send If-None-Match: * when creating', async () => {
        const fetchMock = respond(201, { updatedAt: 'x' });
        vi.stubGlobal('fetch', fetchMock);
        await request('/api/entries/shows/new', { method: 'PUT', body: {}, create: true });
        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(new Headers(init.headers).get('if-none-match')).toBe('*');
    });

    it('should return null data for 204', async () => {
        vi.stubGlobal('fetch', respond(204, null));
        await expect(request('/api/x', { method: 'DELETE' })).resolves.toEqual({
            data: null,
            etag: null,
        });
    });

    it.each([
        [401, UnauthorizedError],
        [412, VersionConflictError],
        [422, ValidationError],
        [500, ApiError],
    ])('should map HTTP %i to its error type', async (status, type) => {
        vi.stubGlobal('fetch', respond(status, { error: 'nope', details: 'arcs[0].id bad' }));
        const error = await request('/api/x').catch((e: unknown) => e);
        expect(error).toBeInstanceOf(type);
        expect((error as ApiError).status).toBe(status);
    });

    it('should expose 422 details for field errors', async () => {
        vi.stubGlobal('fetch', respond(422, { error: 'validation failed', details: 'bad id' }));
        const error = (await request('/api/x').catch((e: unknown) => e)) as ValidationError;
        expect(error.details).toBe('bad id');
    });

    it('should turn a 409 with missing episode IDs into PublishBlockedError', async () => {
        vi.stubGlobal(
            'fetch',
            respond(409, { error: 'episode IDs would disappear', missing: ['drama:a:b:1'] }),
        );
        const error = (await request('/api/publish', { method: 'POST' }).catch(
            (e: unknown) => e,
        )) as PublishBlockedError;
        expect(error).toBeInstanceOf(PublishBlockedError);
        expect(error.missing).toEqual(['drama:a:b:1']);
    });

    it('should keep other 409s as a plain ApiError with the server message', async () => {
        vi.stubGlobal('fetch', respond(409, { error: 'published dramas cannot change their id' }));
        const error = (await request('/api/x').catch((e: unknown) => e)) as ApiError;
        expect(error).not.toBeInstanceOf(PublishBlockedError);
        expect(error.message).toBe('published dramas cannot change their id');
    });

    it('should send raw bytes with their content type', async () => {
        const fetchMock = respond(201, { name: 'abc.webp' });
        vi.stubGlobal('fetch', fetchMock);
        const blob = new Blob(['x'], { type: 'image/webp' });
        await request('/api/assets', { method: 'PUT', raw: blob, contentType: 'image/webp' });
        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(init.body).toBe(blob);
        expect(new Headers(init.headers).get('content-type')).toBe('image/webp');
    });
});
