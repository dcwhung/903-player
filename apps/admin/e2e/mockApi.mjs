// Admin e2e 嘅假 API（page.route）：in-memory 狀態，夠行 login → 掃描 → 待辦 → 設 ID → 發佈 → 記錄、拖曳排序
import { readdirSync } from 'node:fs';

/*
 * 真圖（createState({ realImages: true })）：player catalog 嘅 cover 複製咗去 e2e/fixtures/（只係 e2e 用，唔入 admin bundle）
 * 「口水多過浪花」+「蘭茜夫人劇場」（連短篇「戀愛二分一」）有 Banner / 碟面；其他照舊冇圖（黑碟）
 */
const FIXTURES = new URL('./fixtures/', import.meta.url).pathname;
const FIXTURE_NAMES = new Set(readdirSync(FIXTURES));
const IMAGE_PATH = /^\/catalog\/v1\/img\/([^/]+)$/;
const REAL_IMAGES = {
    waves: { 'tile.webp': 'waves-tile.webp', 'disc.webp': 'waves-disc.webp' },
    lancy: {
        'tile.webp': 'lancy-tile.webp',
        'disc.webp': 'lancy-disc.webp',
        'arcs/half/tile.webp': 'lancy-half-tile.webp',
        'arcs/half/disc.webp': 'lancy-half-disc.webp',
    },
};

const withRealImages = (entry) => {
    const images = REAL_IMAGES[entry.id];
    if (!images) return entry;
    const definition = { ...entry.definition, tile: 'tile.webp', disc: 'disc.webp' };
    if (definition.arcs)
        definition.arcs = definition.arcs.map((arc) =>
            arc.id === 'half'
                ? { ...arc, tile: 'arcs/half/tile.webp', disc: 'arcs/half/disc.webp' }
                : arc,
        );
    return { ...entry, definition, images };
};
const json = (route, body, { status = 200, etag } = {}) =>
    route.fulfill({
        status,
        contentType: 'application/json',
        headers: etag ? { etag } : {},
        body: JSON.stringify(body),
    });

const HK_OFFSET_MS = 8 * 60 * 60 * 1000;
const hkToday = () => new Date(Date.now() + HK_OFFSET_MS).toISOString().slice(0, 10);
const daysFromToday = (days) =>
    new Date(Date.now() + HK_OFFSET_MS + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const show = (id, name, order, extra = {}) => ({
    kind: 'shows',
    id,
    definition: {
        ...extra,
        name,
        fileTime: '1500',
        airDays: [1, 2, 3, 4, 5],
        tile: 'tile.webp',
        disc: 'disc.webp',
        theme: {},
        order,
    },
    images: {},
    draft: false,
    updatedAt: `${id}-v1`,
});

const lancy = () => ({
    kind: 'dramas',
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        order: 1,
        addedAt: '2026-10-27',
        audio: { host: 'r2', folder: '蘭茜夫人劇場', file: '{no2} - {arc}.m4a' },
        arcs: [
            { id: 'half', name: '戀愛二分一', episodes: 30 },
            { id: 'lancy-02', name: '我心不死', episodes: 37, addedAt: '2026-11-01' },
            // 掃描建嘅新短篇：addedAt = 掃描當日、下架、冇排程（排程 tab 要出「未上架」，唔係灰 ✓）
            {
                id: 'love-after',
                name: '戀愛後二分一',
                episodes: 20,
                addedAt: hkToday(),
                enabled: false,
            },
        ],
    },
    images: {},
    draft: false,
    updatedAt: 'lancy-v1',
});

const golden = () => ({
    kind: 'dramas',
    id: 'golden',
    definition: {
        name: '黃金少年',
        kind: 'series',
        enabled: true,
        order: 2,
        addedAt: '2026-10-01',
        arcs: [
            // 全部已上架（跟劇集 1/10）：排程 tab 只可以設下架
            { id: 's1', name: 'Season 1', episodes: 35 },
            // 第 1–15 集已上架（3 批），第 16 集起 6 日後先上架（mockup ⑧）
            {
                id: 's2',
                name: 'Season 2',
                episodes: 30,
                addedAt: daysFromToday(-21),
                episodeDates: {
                    6: daysFromToday(-14),
                    11: daysFromToday(-7),
                    16: daysFromToday(6),
                },
            },
        ],
    },
    images: {},
    draft: false,
    updatedAt: 'golden-v1',
});

/*
 * createState({ missingFolder: true })：「黃金少年」嘅 R2 資料夾改咗名（掃描搵唔到「黃金少年/」），
 * 待辦多一行 missingFolder，編輯頁出「配對」資料夾；未配對資料夾有兩個揀
 */
const withMissingFolder = (entry) =>
    entry.id === 'golden'
        ? {
              ...entry,
              definition: {
                  ...entry.definition,
                  audio: { host: 'r2', folder: '黃金少年', file: '{no2} - {arc}.m4a' },
              },
          }
        : entry;

const UNMAPPED_FOLDERS = ['黃金少年 第一季', '少爺占系列'];

const missingFolderRow = () => ({
    kind: 'missingFolder',
    findingIds: [2],
    dramaId: 'golden',
    arcId: null,
    name: '黃金少年',
    cells: {
        folder: { state: 'must', target: '/dramas/golden#folder' },
        id: { state: 'na' },
        images: { state: 'na' },
        schedule: { state: 'na' },
        summary: { state: 'na' },
    },
});

export const createState = ({ realImages = false, missingFolder = false } = {}) => ({
    loggedIn: false,
    missingFolder,
    entries: [
        show('waves', '口水多過浪花', 1, { airTime: { start: '15:00', end: '16:30' } }),
        show('night', '深夜節目', 2),
        lancy(),
        golden(),
    ]
        .map((entry) => (realImages ? withRealImages(entry) : entry))
        .map((entry) => (missingFolder ? withMissingFolder(entry) : entry)),
    publishes: [],
    /** 之前嘅記錄（#2 成功、#1 失敗）：上下架記錄出到「還原」同「失敗」 */
    history: [
        { ...publishRow(2), current: false, createdAt: '2026-11-09T14:40:00.000Z' },
        {
            ...publishRow(1),
            current: false,
            status: 'failed',
            error: 'R2 寫入失敗',
            createdAt: '2026-11-08T03:10:00.000Z',
        },
    ],
    orders: [],
    puts: [],
    confirms: [],
    assets: [],
});

/** 新短篇：掃描自動編號 lancy-02；未確認（confirm-id）又未改名就係必須（同 apps/api todos） */
const AUTO_ARC_ID = 'lancy-02';
const todosOf = (state) => {
    const drama = state.entries.find((e) => e.id === 'lancy');
    const arc = drama.definition.arcs[1];
    const confirmed = state.confirms.some((c) => c.arcId === arc.id);
    const placeholder = arc.id === AUTO_ARC_ID && !confirmed;
    if (state.publishes.length > 0) return { rows: [], blocking: 0 };
    const target = `/dramas/lancy/arcs#${arc.id}`;
    const row = {
        kind: 'newArc',
        findingIds: [1],
        dramaId: 'lancy',
        arcId: arc.id,
        name: `蘭茜夫人劇場 · ${arc.name}`,
        cells: {
            // 資料夾係掃描搵到嘅 = done（同 apps/api todos）
            folder: { state: 'done', target: '/dramas/lancy#folder' },
            id: { state: placeholder ? 'must' : 'done', target },
            images: { state: 'optional', target },
            schedule: { state: 'done', target: `/dramas/lancy/schedule#${arc.id}` },
            summary: { state: 'optional', target },
        },
    };
    if (state.missingFolder)
        return { rows: [row, missingFolderRow()], blocking: placeholder ? 2 : 1 };
    return { rows: [row], blocking: placeholder ? 1 : 0 };
};

const changesOf = (state) => {
    if (state.publishes.length > 0) return { items: [], timeline: [] };
    const arcId = state.entries?.find((e) => e.id === 'lancy').definition.arcs[1].id ?? AUTO_ARC_ID;
    const item = {
        kind: 'newArc',
        when: 'now',
        entry: { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' },
        arc: { id: arcId, name: '我心不死', label: '我心不死' },
        detail: { episodes: { first: 1, last: 37 } },
    };
    return { items: [item], timeline: [{ when: 'now', items: [item] }] };
};

const publishRow = (id) => ({
    id,
    createdAt: new Date().toISOString(),
    createdBy: 'admin@example.com',
    hash: 'abc',
    showCount: 1,
    dramaCount: 2,
    episodeCount: 102,
    rollbackOf: null,
    status: 'ok',
    error: null,
    current: true,
    changes: changesOf({ publishes: [] }),
});

/** If-None-Match: * = 新增（admin 新節目）；同 apps/api 一樣回 201 */
const createRoute = (state, route, request, [kind, id]) => {
    const body = request.postDataJSON();
    const updatedAt = `${id}-v1`;
    state.entries.push({ kind, id, ...body, draft: true, updatedAt });
    state.puts.push({ kind, id, body });
    return json(
        route,
        { updatedAt, draft: true, warnings: { missingEpisodeIds: [] } },
        { status: 201, etag: `"${updatedAt}"` },
    );
};

const entryRoute = (state, route, request, [kind, id]) => {
    const entry = state.entries.find((e) => e.kind === kind && e.id === id);
    if (!entry && request.method() === 'PUT' && request.headers()['if-none-match'] === '*')
        return createRoute(state, route, request, [kind, id]);
    if (!entry) return json(route, { error: 'no such entry' }, { status: 404 });
    if (request.method() === 'GET')
        return json(
            route,
            {
                definition: entry.definition,
                images: entry.images,
                draft: entry.draft,
                updatedAt: entry.updatedAt,
            },
            { etag: `"${entry.updatedAt}"` },
        );
    if (request.headers()['if-match'] !== `"${entry.updatedAt}"`)
        return json(route, { error: 'entry changed' }, { status: 412 });
    const body = request.postDataJSON();
    Object.assign(entry, body, { updatedAt: `${id}-v${state.puts.length + 2}` });
    state.puts.push({ kind, id, body });
    return json(
        route,
        { updatedAt: entry.updatedAt, draft: false, warnings: { missingEpisodeIds: [] } },
        { etag: `"${entry.updatedAt}"` },
    );
};

const DAY_MS = 24 * 60 * 60 * 1000;
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/** 同 packages/catalog expandSchedule 一樣形狀（{ addedAt, episodeDates, episodeRemovedAt }）嘅簡化展開 */
const expandRule = (rule, count, firstNo = 1) => {
    if (rule.kind === 'dates') {
        const [first, ...rest] = rule.batches;
        return {
            addedAt: first.date,
            episodeDates: Object.fromEntries(rest.map((b) => [b.from, b.date])),
            episodeRemovedAt: {},
        };
    }
    const fits = (ms) =>
        'weekdays' in rule.every ? rule.every.weekdays.includes(new Date(ms).getUTCDay()) : true;
    const step = 'days' in rule.every ? rule.every.days * DAY_MS : DAY_MS;
    let ms = Date.parse(`${rule.start}T00:00:00Z`);
    while (!fits(ms)) ms += DAY_MS;
    const dates = [];
    for (let no = firstNo; no < firstNo + count; no += rule.perRelease) {
        dates.push([no, isoOf(ms)]);
        do ms += step;
        while (!fits(ms));
    }
    const [[, addedAt], ...later] = dates;
    return { addedAt, episodeDates: Object.fromEntries(later), episodeRemovedAt: {} };
};

const previewRoute = (state, route, request, [dramaId, arcId]) => {
    const drama = state.entries.find((e) => e.kind === 'dramas' && e.id === dramaId);
    const arc = drama?.definition.arcs.find((a) => a.id === arcId);
    if (!arc) return json(route, { error: 'no such arc' }, { status: 404 });
    const expanded = expandRule(request.postDataJSON().rule, arc.episodes, arc.firstNo ?? 1);
    return json(route, { expanded, warnings: { missingEpisodeIds: [] } });
};

const handlers = {
    'GET /api/me': (state, route) =>
        state.loggedIn
            ? json(route, { email: 'admin@example.com' })
            : json(route, { error: 'not logged in' }, { status: 401 }),
    'POST /api/scan': (state, route) =>
        json(route, { scannedAt: new Date().toISOString(), findings: [], skipped: [] }),
    'GET /api/todos': (state, route) => json(route, todosOf(state)),
    'GET /api/folders/unmapped': (state, route) => json(route, { folders: UNMAPPED_FOLDERS }),
    'GET /api/entries': (state, route) =>
        json(route, {
            entries: state.entries.map(({ kind, id, definition, draft, updatedAt }) => ({
                kind,
                id,
                name: definition.name,
                enabled: definition.enabled ?? true,
                draft,
                updatedAt,
            })),
        }),
    'GET /api/changes': (state, route) =>
        json(route, {
            base: null,
            changes: changesOf(state),
            validation: { ok: true, episodeCount: 102 },
        }),
    'POST /api/publish': (state, route) => {
        const row = publishRow(state.publishes.length + 1 + state.history.length);
        state.publishes.unshift(row);
        return json(route, { publish: row });
    },
    'GET /api/publishes': (state, route) =>
        json(route, { publishes: [...state.publishes, ...state.history] }),
    'POST /api/todos/confirm-id': (state, route, request) => {
        state.confirms.push(request.postDataJSON());
        return json(route, { confirmed: 1 });
    },
    'PUT /api/assets': (state, route, request) => {
        state.assets.push(request.postDataBuffer());
        return json(route, { name: `img${state.assets.length}.webp` });
    },
};

export const installMockApi = async (page, state) => {
    // 圖片（R2 /catalog/v1/img/<name>）：fixtures 有就出真圖，冇就 404（= 未上載）
    await page.route(/\/catalog\/v1\/img\//, (route, request) => {
        const name = decodeURIComponent(
            new URL(request.url()).pathname.match(IMAGE_PATH)?.[1] ?? '',
        );
        if (!FIXTURE_NAMES.has(name)) return route.fulfill({ status: 404 });
        return route.fulfill({ path: `${FIXTURES}${name}`, contentType: 'image/webp' });
    });
    await page.route(/\/(api|auth)\//, (route, request) => {
        const url = new URL(request.url());
        const key = `${request.method()} ${url.pathname}`;
        const entry = url.pathname.match(/^\/api\/entries\/(shows|dramas)\/([^/]+)$/);
        if (entry) return entryRoute(state, route, request, entry.slice(1));
        if (/^PUT \/api\/order\//.test(key)) {
            state.orders.push({
                kind: url.pathname.split('/').pop(),
                ids: request.postDataJSON().ids,
            });
            return json(route, { ids: request.postDataJSON().ids, changed: [] });
        }
        const preview = url.pathname.match(
            /^\/api\/dramas\/([^/]+)\/arcs\/([^/]+)\/schedule\/preview$/,
        );
        if (preview) return previewRoute(state, route, request, preview.slice(1));
        if (/\/schedule$/.test(url.pathname))
            return json(route, { error: 'no such schedule' }, { status: 404 });
        const handler = handlers[key];
        return handler
            ? handler(state, route, request)
            : json(route, { error: `no mock for ${key}` }, { status: 404 });
    });
};
