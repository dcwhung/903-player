// 「現有裝置零改變」截圖比對（P10 lane 0）嘅純邏輯：凍結嘅 viewport 清單、命名、參數、位置比對、總結。
// 冇 Playwright / fs：src/e2eVisualModel.node.test.ts 直接 import 嚟測；瀏覽器嗰邊喺 visualDiff.mjs。

const viewport = (kind, width, height) => ({
    id: `${width}x${height}`,
    kind,
    width,
    height,
    touch: kind !== 'desktop',
});

/**
 * 凍結嘅現有裝置清單：v2.0.0 嘅 iPhone Duo / HomeView 改動喺呢啲 viewport 一定要同 main 逐 pixel 一樣。
 * 只可以加、唔好改或者刪（刪咗就少咗保障）；新嘅裝置 query 一定唔可以 match 呢度任何一個。
 * 640x360、1000x561、1000x562：現有三個斷點（src/config/layout.ts）嘅邊界
 */
export const VISUAL_VIEWPORTS = Object.freeze([
    viewport('phone-portrait', 320, 568),
    viewport('phone-portrait', 375, 667),
    viewport('phone-portrait', 390, 844),
    viewport('phone-portrait', 430, 932),
    viewport('phone-landscape', 568, 320),
    viewport('phone-landscape', 640, 360),
    viewport('phone-landscape', 667, 375),
    viewport('phone-landscape', 844, 390),
    viewport('phone-landscape', 932, 430),
    viewport('phone-landscape', 1000, 561),
    viewport('tablet-portrait', 768, 1024),
    viewport('tablet-portrait', 820, 1180),
    viewport('tablet-landscape', 1000, 562),
    viewport('tablet-landscape', 1024, 768),
    viewport('tablet-landscape', 1180, 820),
    viewport('desktop', 1280, 800),
    viewport('desktop', 1440, 900),
    viewport('desktop', 1920, 1080),
]);

/**
 * 截圖 context 嘅時區：app 有跟裝置本地時間嘅 UI（例如 21:00–05:00 先出嘅睡眠 timer 月亮掣），
 * 唔固定就會跟跑嘅機（CI 係 UTC），同一個 E2E_NOW 出唔同畫面
 */
export const VISUAL_TIMEZONE = 'Asia/Hong_Kong';
/** 日間情境嘅時鐘起點：同 harness E2E_NOW 同一日（30/11 星期一），14:00 唔喺夜間時段 */
export const VISUAL_DAY_NOW = '2026-11-30T14:00:00+08:00';
const DAY_SUFFIX = '-day';

/** 複製指定情境做日間版：id 加 -day、時鐘換做 now，seed / run 照用；冇呢個情境就 throw */
export const dayScenes = (scenes, ids, now) =>
    ids.map((id) => {
        const scene = scenes.find((item) => item.id === id);
        if (!scene) throw new Error(`冇呢個情境：${id}`);
        return { ...scene, id: `${id}${DAY_SUFFIX}`, now };
    });

/** 截圖檔名（唔連副檔名）同報告用嘅名 */
export const shotName = (sceneId, { id }) => `${sceneId}@${id}`;

const keepSelected = (items, wanted, label) => {
    if (wanted.length === 0) return items;
    const known = new Set(items.map((item) => item.id));
    const unknown = wanted.filter((id) => !known.has(id));
    if (unknown.length > 0) {
        throw new Error(`冇呢個${label}：${unknown.join('、')}（有：${[...known].join('、')}）`);
    }
    return items.filter((item) => wanted.includes(item.id));
};

/** 要影嘅清單：每個 viewport × 每個情境；filter 有值就只留揀中嘅，揀咗唔存在嘅 id 會 throw */
export const selectShots = (scenes, viewports, filter) => {
    const pickedScenes = keepSelected(scenes, filter.scenes, '情境');
    const pickedViewports = keepSelected(viewports, filter.viewports, ' viewport');
    return pickedViewports.flatMap((picked) =>
        pickedScenes.map((scene) => ({
            name: shotName(scene.id, picked),
            scene,
            viewport: picked,
        })),
    );
};

const LIST_FLAGS = { '--scene': 'scenes', '--viewport': 'viewports' };
const VALUE_FLAGS = { '--base': 'base' };
const BOOLEAN_FLAGS = { '--keep-worktree': 'keepWorktree' };

/** `--flag value` 同 `--flag=value` 都得 */
const splitFlag = (arg) => {
    const at = arg.indexOf('=');
    return at === -1 ? [arg, undefined] : [arg.slice(0, at), arg.slice(at + 1)];
};

/** node e2e/visualDiff.mjs 嘅參數；base 冇畀就係 undefined，由 caller 用 merge-base 決定 */
export const parseVisualArgs = (argv, env) => {
    const args = {
        base: env.VISUAL_BASE || undefined,
        scenes: [],
        viewports: [],
        keepWorktree: false,
    };
    const rest = [...argv];
    while (rest.length > 0) {
        const [flag, inline] = splitFlag(rest.shift());
        if (flag in BOOLEAN_FLAGS) {
            args[BOOLEAN_FLAGS[flag]] = true;
            continue;
        }
        if (!(flag in LIST_FLAGS) && !(flag in VALUE_FLAGS)) throw new Error(`唔識嘅參數：${flag}`);
        const value = inline ?? rest.shift();
        if (value === undefined || value === '') throw new Error(`${flag} 要跟一個值`);
        if (flag in VALUE_FLAGS) args[VALUE_FLAGS[flag]] = value;
        else args[LIST_FLAGS[flag]].push(...value.split(',').filter(Boolean));
    }
    return args;
};

/**
 * 版本號嘅樣同替代字（「v1.37.3」同讀屏用嘅「版本 1.37.3」都計；$1 留返個 v）。
 * visualDiff.mjs 會將呢兩個傳入瀏覽器用（頁面入面 import 唔到呢個模組）
 */
export const VERSION_TEXT = /(v?)\d+\.\d+\.\d+/g;
export const VERSION_PLACEHOLDER = '$10.0.0';

/** 兩個 build 嘅版本號可以唔同（release 會 bump）：截圖前換做固定字，唔當係版面改咗 */
export const normalizeVersionText = (text) => text.replace(VERSION_TEXT, VERSION_PLACEHOLDER);

/** 位置比對最多報幾多個元素（一個版面郁咗通常成串跟住郁，報晒冇用） */
export const GEOMETRY_REPORT_LIMIT = 10;
/** 位置數值容差（px）：getBoundingClientRect 嘅浮點誤差 */
const GEOMETRY_EPSILON_PX = 0.01;
const GEOMETRY_FIELDS = ['x', 'y', 'width', 'height'];

const sameItem = (base, head) =>
    base.key === head.key &&
    GEOMETRY_FIELDS.every((field) => Math.abs(base[field] - head[field]) <= GEOMETRY_EPSILON_PX);

/**
 * 逐個元素（文件次序）比位置：截圖只影到可見範圍，捲出畫面嘅內容靠呢個。
 * 回傳唔同嘅元素（最多 GEOMETRY_REPORT_LIMIT 個）；其中一邊冇嗰個元素就係 null
 */
export const diffGeometry = (base, head) => {
    const diffs = [];
    const length = Math.max(base.length, head.length);
    for (let index = 0; index < length && diffs.length < GEOMETRY_REPORT_LIMIT; index += 1) {
        const before = base[index] ?? null;
        const after = head[index] ?? null;
        if (before && after && sameItem(before, after)) continue;
        diffs.push({ index, base: before, head: after });
    }
    return diffs;
};

const isDifferent = (result) => result.pixels > 0 || result.geometry.length > 0;

/** 報告：每張唔同嘅一行，最後一行總結；一張都冇影到唔算 ok */
export const summarize = (results) => {
    const different = results.filter(isDifferent);
    const lines = different.map(
        ({ name, pixels, geometry }) =>
            `DIFF  ${name}：${pixels} 個 pixel 唔同、${geometry.length} 個元素位置唔同`,
    );
    const ok = results.length > 0 && different.length === 0;
    const verdict =
        results.length === 0
            ? '冇影到任何截圖'
            : different.length === 0
              ? '全部一樣'
              : `${different.length} 張唔同`;
    lines.push(`${ok ? 'PASS' : 'FAIL'}  比對咗 ${results.length} 張：${verdict}`);
    return { ok, lines };
};
