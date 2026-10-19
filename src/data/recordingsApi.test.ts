import { fetchRecordings } from './recordingsApi';

const VALID = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/a.aac',
};

const respond = (body: unknown, ok = true) =>
    vi.fn(async () => ({ ok, json: async () => body }) as Response);

describe('fetchRecordings', () => {
    it('returns validated recordings', async () => {
        const fetchMock = respond({ generatedAt: 'x', recordings: [VALID] });

        await expect(fetchRecordings(fetchMock)).resolves.toEqual([VALID]);
        expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/data\/recordings\.json$/), {
            cache: 'no-cache',
        });
    });

    it('drops malformed or foreign entries', async () => {
        const fetchMock = respond({
            recordings: [
                VALID,
                { ...VALID, showId: 'unknown' },
                { ...VALID, date: '17/10/2026' },
                { ...VALID, url: 'https://evil.example.com/a.aac' },
                null,
            ],
        });

        await expect(fetchRecordings(fetchMock)).resolves.toEqual([VALID]);
    });

    it('rejects on HTTP errors', async () => {
        await expect(fetchRecordings(respond({}, false))).rejects.toThrow();
    });

    it('rejects when the payload has no recordings list', async () => {
        await expect(fetchRecordings(respond({ foo: 1 }))).rejects.toThrow();
    });
});
