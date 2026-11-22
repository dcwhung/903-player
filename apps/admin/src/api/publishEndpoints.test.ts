import { ValidationError } from './client';
import { changesPath, isStaleSelection, publish } from './publishEndpoints';

describe('publishEndpoints', () => {
    it('should URL-encode the selection into GET /api/changes', () => {
        const selection = {
            content: ['newArc/a/b'],
            branding: { icon: true, text: false },
            banner: false,
        };
        const path = changesPath(selection);
        expect(path.startsWith('/api/changes?selection=')).toBe(true);
        expect(JSON.parse(new URLSearchParams(path.split('?')[1]).get('selection') ?? '')).toEqual(
            selection,
        );
        expect(changesPath()).toBe('/api/changes');
    });

    it('should treat only 422 unknown selection keys as a stale page', () => {
        expect(isStaleSelection(new ValidationError(422, 'unknown selection keys'))).toBe(true);
        expect(isStaleSelection(new ValidationError(422, 'banner: bad'))).toBe(false);
        expect(isStaleSelection(new Error('unknown selection keys'))).toBe(false);
    });

    describe('publish body (AU-021)', () => {
        const SELECTION = { content: [], branding: { icon: false, text: false }, banner: false };
        const stub = () => {
            const fetchMock = vi.fn((_input: string, _init?: RequestInit) =>
                Promise.resolve(new Response(JSON.stringify({ publish: { id: 1 } }))),
            );
            vi.stubGlobal('fetch', fetchMock);
            return fetchMock;
        };
        const sentBody = (fetchMock: ReturnType<typeof stub>) => {
            const body = fetchMock.mock.calls[0]?.[1]?.body;
            return typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;
        };

        it('should send the fingerprint next to the selection', async () => {
            const fetchMock = stub();
            await publish(SELECTION, 'fp1');
            expect(sentBody(fetchMock)).toEqual({ selection: SELECTION, fingerprint: 'fp1' });
        });

        it('should leave the fingerprint out when the API did not give one', async () => {
            const fetchMock = stub();
            await publish(SELECTION);
            expect(sentBody(fetchMock)).toEqual({ selection: SELECTION });
        });

        it('should send no body without a selection or fingerprint (old behaviour)', async () => {
            const fetchMock = stub();
            await publish();
            expect(sentBody(fetchMock)).toBeUndefined();
        });
    });
});
