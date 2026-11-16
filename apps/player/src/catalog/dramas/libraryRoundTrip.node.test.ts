// @vitest-environment node
// 要用 node:fs 讀 library：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { readdirSync, readFileSync } from 'node:fs';
import {
    buildEpisodes,
    DRAMA_AUDIO_BASE,
    generateDraft,
    isPlaceholderArcId,
    parseDramaDefinition,
    type DraftResult,
    type Issue,
} from '@903-player/catalog';
import { compileSchema } from '@903-player/catalog/testing/json-schemas';
import { episodeFile, listingOf, range } from '@903-player/catalog/testing/scan-listing';
import { episodeOptionsFor } from './lib/episodeOptionsFor';

/*
 * Library round-trip（由已刪嘅 scripts/dramaFromFolder.test.ts 搬過嚟）：
 * 由 library 每套劇 app 砌出嚟嘅錄音網址，砌返成棵 R2 folder listing，再行 admin / API 掃描用嘅
 * generateDraft（同 apps/api/src/admin/rescan.ts 一樣傳 id + existing），
 * 要生成返一模一樣嘅 drama.json：掃描規則（packages/catalog/src/scan/）同 app 規則
 *（packages/catalog/src/dramas/）唔可以甩。純掃描規則嘅 case 喺 packages/catalog/src/scan/*.test.ts
 */
const LIBRARY = new URL('./library/', import.meta.url);
/** 香港日期（新短篇 addedAt） */
const TODAY = '2026-10-29';
/** host: app 嘅錄音 base：用固定 base path，唔讀 import.meta.env（node test 冇 vite/client） */
const BASE_PATH = '/';
const EPISODE_OPTIONS = episodeOptionsFor(BASE_PATH);
const DRAMA_COVER = 'cover photo.png';
const ARC_COVER = 'cover photo.jpg';
const PATH_SEPARATOR = '/';

type Json = Record<string, unknown>;

const libraryIds = (): string[] =>
    readdirSync(LIBRARY, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

const committed = (id: string): Json =>
    JSON.parse(readFileSync(new URL(`${id}/drama.json`, LIBRARY), 'utf8')) as Json;

const imagesOf = (json: Json): string[] => {
    const arcs = (json.arcs as Json[] | undefined) ?? [];
    return [json.tile, json.disc, ...arcs.flatMap((a) => [a.disc, a.tile])].filter(
        (f): f is string => typeof f === 'string',
    );
};

/** packages/catalog/schemas/drama.schema.json（嚴過 runtime） */
const dramaSchema = compileSchema('drama');

/** 用 app 真正嘅 validator + episode builder 展開（唔合格會 throw），亦要過 JSON Schema */
const appEpisodes = (id: string, json: unknown) => {
    expect(dramaSchema(json), JSON.stringify(dramaSchema.errors)).toBe(true);
    const files = new Set(imagesOf(json as Json));
    const def = parseDramaDefinition(json, { id, source: `${id}/drama.json`, files });
    return buildEpisodes(id, def, EPISODE_OPTIONS);
};

/** 錄音網址去咗 base 之後 → 劇集 folder 樹入面嘅相對路徑（每段 decode）；唔係由 base 開頭即係 host 揀錯 */
const decodedPath = (url: string, base: string): string => {
    if (!url.startsWith(base)) throw new Error(`${url} 唔係由 ${base} 開頭`);
    return url
        .slice(base.length)
        .split(PATH_SEPARATOR)
        .map(decodeURIComponent)
        .join(PATH_SEPARATOR);
};

/** 跟 audio.host 揀 base：r2 用 R2 網址，app（例如 c18）用 app 自己嘅 dramas/ */
const audioPathOf = (json: Json, url: string): string =>
    (json.audio as Json).host === 'r2'
        ? decodedPath(url, `${DRAMA_AUDIO_BASE}${PATH_SEPARATOR}`)
        : decodedPath(url, EPISODE_OPTIONS.appAudioBase);

/** 每集錄音喺 folder 樹入面嘅相對路徑（連劇集 folder；排好序，host 唔同都比得） */
const audioPaths = (id: string, json: Json): string[] =>
    appEpisodes(id, json)
        .map((e) => audioPathOf(json, e.url))
        .sort();

/** 照 app 砌出嚟嘅網址砌返成個 R2 listing（連 cover；每日劇冇短篇） */
const mirrorListing = (id: string) => {
    const json = committed(id);
    const folder = (json.audio as Json).folder as string;
    const prefix = `${folder}${PATH_SEPARATOR}`;
    const arcCovers = ((json.arcs as Json[] | undefined) ?? []).map(
        (a) => `${a.name as string}${PATH_SEPARATOR}${ARC_COVER}`,
    );
    const episodes = audioPaths(id, json).map((path) => path.slice(prefix.length));
    return listingOf(folder, [...episodes, DRAMA_COVER, ...arcCovers]);
};

const scan = (id: string, existing?: Json): DraftResult =>
    generateDraft(mirrorListing(id), { id, existing, today: TODAY });

/** 生成成功嘅 drama.json；有 error 就直接 fail 兼列出原因 */
const jsonOf = (result: DraftResult): Json => {
    if (result.json === null) throw new Error(messagesOf(result.issues, 'error'));
    return result.json;
};

const errorsOf = (issues: readonly Issue[]): Issue[] => issues.filter((i) => i.level === 'error');
const messagesOf = (issues: readonly Issue[], level: string): string =>
    issues
        .filter((i) => i.level === level)
        .map((i) => `${i.where}：${i.message}`)
        .join('\n');

describe('library drama.json — scan round-trip', () => {
    it('should cover every library drama', () => {
        expect(libraryIds().length).toBeGreaterThan(0);
    });

    it.each(libraryIds())('should regenerate %s unchanged with the existing definition', (id) => {
        const { json, issues } = scan(id, committed(id));
        expect(errorsOf(issues)).toEqual([]);
        expect(json).toEqual(committed(id));
    });

    it.each(libraryIds())('should rebuild the same audio paths for %s from scratch', (id) => {
        // 由零生成一律 host: r2（先驗呢個前提）；c18 commit 咗係 host: app，所以比相對路徑：
        // 生成嗰邊 host r2 + 網址由 R2 base 開頭 + 路徑一樣，先等同網址指住同一個上載檔
        const json = jsonOf(scan(id));
        expect((json.audio as Json).host).toBe('r2');
        appEpisodes(id, json).forEach((e) =>
            expect(e.url.startsWith(`${DRAMA_AUDIO_BASE}${PATH_SEPARATOR}`)).toBe(true),
        );
        expect(audioPaths(id, json)).toEqual(audioPaths(id, committed(id)));
    });

    it('should regenerate the lancy arcs exactly (diff against committed drama.json)', () => {
        const json = jsonOf(scan('lancy'));
        const strip = (arcs: Json[]) =>
            arcs
                .map(({ name, episodes }) => ({ name, episodes }))
                .sort((a, b) => String(a.name).localeCompare(String(b.name)));
        expect(strip(json.arcs as Json[])).toEqual(strip(committed('lancy').arcs as Json[]));
    });
});

describe('library drama.json — merging a rescan into lancy', () => {
    const DRAMA = '蘭茜夫人劇場';
    const LANCY = 'lancy';
    /** 「戀愛二分一」由 30 集加到 31 集 */
    const GROWN_ARC_EPISODES = 31;
    const KEPT_ARC_EPISODES = 33;
    const NEW_ARC_EPISODES = 2;
    const rescan = (paths: readonly string[]): DraftResult =>
        generateDraft(listingOf(DRAMA, paths), {
            id: LANCY,
            existing: committed(LANCY),
            today: TODAY,
        });

    it('should keep hand-written fields, flag a missing arc and date a new arc today', () => {
        const result = rescan([
            ...range(1, GROWN_ARC_EPISODES).map((n) => episodeFile('戀愛二分一', n)),
            ...range(1, KEPT_ARC_EPISODES).map((n) => episodeFile('初戀無限次', n)),
            ...range(1, NEW_ARC_EPISODES).map((n) => episodeFile('新短篇', n)),
        ]);
        const { arcs, ...rest } = jsonOf(result);
        const { arcs: oldArcs, ...oldRest } = committed(LANCY);
        expect(rest).toEqual(oldRest);
        const [grown, kept, missing] = oldArcs as Json[];
        expect(arcs).toEqual([
            { ...grown, episodes: GROWN_ARC_EPISODES },
            kept,
            missing,
            { id: 'lancy-04', name: '新短篇', addedAt: TODAY, episodes: NEW_ARC_EPISODES },
        ]);
        expect(messagesOf(result.issues, 'warn')).toContain('我心不死：R2 資料夾冇呢個短篇');
        expect(messagesOf(result.issues, 'info')).toContain('戀愛二分一：集數由 30 變 31');
        expect(messagesOf(result.issues, 'info')).toContain('新短篇：新短篇');
    });

    it('should block when the existing kind does not match the folder', () => {
        expect(rescan(['20261023.m4a']).json).toBeNull();
    });
});

/*
 * S-747（由已刪嘅 scripts/dramaFromFolder.test.ts 搬過嚟）：唔知劇 ID 嘅掃描會畀新短篇出 placeholder id「arc-NN」兼 warn。
 * id 係 episode ID（進度 / 收藏 key）嘅一部份，placeholder 發佈咗先改名會令進度斷，
 * 所以 library 入面 commit 咗嘅 drama.json 一律唔准留低 placeholder（新劇 folder 自動包埋）
 */
describe('library drama.json — no placeholder arc ids (S-747)', () => {
    const placeholderArcIds = (json: Json): string[] =>
        ((json.arcs as Json[] | undefined) ?? [])
            .map((arc) => String(arc.id))
            .filter(isPlaceholderArcId);

    it('should pick out placeholder arc ids from a drama.json', () => {
        const json: Json = {
            arcs: [{ id: 'season-1' }, { id: 'arc-01' }, { id: 'lancy-04' }, { id: 'arc-12' }],
        };
        expect(placeholderArcIds(json)).toEqual(['arc-01', 'arc-12']);
    });

    it.each(libraryIds())('should have no placeholder arc id left in %s/drama.json', (id) => {
        expect(placeholderArcIds(committed(id)), `${id}: 請將 arc-NN 改做英文 slug`).toEqual([]);
    });
});
