import { env } from 'cloudflare:test';
import { hkToday } from '@903-player/catalog';
import { listingFromR2 } from '../src/content/r2Listing';
import { adminGet, adminRequest, call, loginCookie, ORIGIN } from './helpers';
import { drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const FOLDER = '黃金少年';
const TEMPLATE = '{no2} - {arc} - 第{noZh}集[ - {title}].m4a';
const NUMERALS = ['', '一', '二', '三', '四'];

/** 標準檔名嘅短篇劇（scan 要 parse 到「NN - 短篇 - 第N集」） */
const scannable = (episodes: number): Json => ({
    ...drama(episodes),
    audio: { host: 'r2', folder: FOLDER, file: TEMPLATE },
});

const episodeKey = (arc: string, no: number) =>
    `${FOLDER}/${arc}/0${no} - ${arc} - 第${NUMERALS[no]}集.m4a`;

const upload = (keys: readonly string[]) =>
    Promise.all(keys.map((key) => env.AUDIO.put(key, new Uint8Array([0]))));

const scan = async (id = 'golden') => {
    const response = await adminRequest('POST', `/api/dramas/${id}/scan`);
    return { status: response.status, body: (await response.json()) as Json };
};

beforeEach(async () => {
    await seed(3);
    await putEntry('dramas', 'golden', scannable(3));
    await upload([1, 2, 3].map((no) => episodeKey('Season 1', no)));
    await upload([`${FOLDER}/cover photo.png`, `${FOLDER}/Season 1/cover photo.jpg`]);
});

describe('POST /api/dramas/:id/scan', () => {
    it('should return an empty diff when R2 matches the definition', async () => {
        const { status, body } = await scan();
        expect(status).toBe(200);
        expect(body.diff).toEqual([]);
        expect(body.draft).toEqual(scannable(3));
        expect((body.issues as Json[]).filter((i) => i.level === 'error')).toEqual([]);
    });

    it('should report new episodes in the diff without writing D1', async () => {
        await upload([episodeKey('Season 1', 4)]);
        const { body } = await scan();
        expect(body.diff).toEqual([{ path: 'arcs[0].episodes', before: 3, after: 4 }]);
        const stored = await adminGet('/api/entries/dramas/golden');
        expect(((await stored.json()) as { definition: Json }).definition).toEqual(scannable(3));
    });

    it('should add a new arc folder with an auto id <dramaId>-NN and today as addedAt', async () => {
        await upload([episodeKey('Season 2', 1)]);
        const { body } = await scan();
        const arcs = (body.draft as Json).arcs as Json[];
        expect(arcs[1]).toEqual({
            id: 'golden-02',
            name: 'Season 2',
            addedAt: hkToday(),
            episodes: 1,
        });
        expect(body.diff).toEqual([{ path: 'arcs[1]', after: arcs[1] }]);
    });

    it('should return a null draft with the errors when the folder has problems', async () => {
        await upload([episodeKey('Season 1', 4).replace('/04', '/05').replace('第四集', '第五集')]);
        const { status, body } = await scan();
        expect(status).toBe(200);
        expect(body.draft).toBeNull();
        expect(JSON.stringify(body.issues)).toContain('缺第 4 集');
        expect(body.diff).toEqual([]);
    });

    it('should answer 404 for an unknown drama and 422 for audio not hosted on R2', async () => {
        expect((await scan('nope')).status).toBe(404);
        await putEntry('dramas', 'golden', {
            ...scannable(3),
            audio: { host: 'app', folder: FOLDER, file: TEMPLATE },
        });
        expect((await scan()).status).toBe(422);
    });

    it('should answer 400 for an invalid drama id, like /entries (S-787)', async () => {
        const { status, body } = await scan('Bad_Id');
        expect(status).toBe(400);
        expect(body.error).toContain('id must match');
    });

    it('should need the same origin', async () => {
        const response = await call('/api/dramas/golden/scan', {
            method: 'POST',
            headers: { cookie: await loginCookie() },
        });
        expect(response.status).toBe(403);
        expect(ORIGIN).toBeTruthy();
    });
});

describe('listingFromR2', () => {
    /** 假 bucket：每頁最多 2 個，驗 cursor 分頁同 delimiter */
    const pagedBucket = (keys: readonly string[]) => {
        const PAGE = 2;
        return {
            list: async ({ prefix = '', delimiter, cursor }: R2ListOptions) => {
                const below = keys
                    .filter((k) => k.startsWith(prefix))
                    .map((k) => k.slice(prefix.length));
                const folders = [
                    ...new Set(
                        below
                            .filter((k) => delimiter && k.includes(delimiter))
                            .map((k) => k.split('/')[0]),
                    ),
                ];
                const files = below.filter((k) => !k.includes('/') && k !== '');
                const all = [
                    ...files.map((f) => ({ key: `${prefix}${f}` })),
                    ...folders.map((d) => `${prefix}${d}/`),
                ];
                const start = Number(cursor ?? 0);
                const page = all.slice(start, start + PAGE);
                const truncated = start + PAGE < all.length;
                return {
                    objects: page.filter((p): p is { key: string } => typeof p !== 'string'),
                    delimitedPrefixes: page.filter((p): p is string => typeof p === 'string'),
                    truncated,
                    ...(truncated ? { cursor: String(start + PAGE) } : {}),
                };
            },
        } as unknown as R2Bucket;
    };

    it('should follow cursors and mark nested folders with a trailing slash', async () => {
        const bucket = pagedBucket([
            '劇/', // folder marker object
            '劇/a.png',
            '劇/b.m4a',
            '劇/甲/01.m4a',
            '劇/甲/02.m4a',
            '劇/甲/03.m4a',
            '劇/甲/sub/x.m4a',
            '劇/乙/01.m4a',
            '其他/x.m4a',
        ]);
        expect(await listingFromR2(bucket, '劇')).toEqual({
            name: '劇',
            rootFiles: ['a.png', 'b.m4a'],
            arcs: [
                { name: '甲', files: ['01.m4a', '02.m4a', '03.m4a', 'sub/'] },
                { name: '乙', files: ['01.m4a'] },
            ],
        });
    });
});
