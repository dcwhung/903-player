// 直版主頁節目格動態欄數 e2e（_mockups_/dynamic-show-grid，用戶揀咗方案，player 1.35.0）。
// 格數 = 節目格 + 最尾「今日節目」格：≤ 2 格一欄、≥ 3 格兩欄；兩欄而格數單數，今日節目橫跨成行；
// 一頁放得晒就置頂（唔 space-between），要分頁先 space-between。
// 節目數靠 remote catalog route 隔離（e2e-catalog/catalog.json 答一份節目數唔同嘅 catalog），
// 唔改內建資料，其他 section 照用 7 個節目。每個情境獨立 context
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { PHONE, runSection } from './harness.mjs';
import { openWithCatalog } from './remoteCatalog.mjs';

const CATALOG_DIR = new URL('../src/catalog/', import.meta.url);
const CATALOG_FOLDER = 'e2e-catalog/';
const SHOWS_NAV = '節目';
const TODAY_LABEL = '今日節目';
/** iPad 直放（唔 match LANDSCAPE_QUERY）：同手機直版用同一套規則 */
const TABLET_PORTRAIT = { width: 820, height: 1180 };
/** 等主頁節目格出（catalog 載入 + render）最多幾耐 */
const GRID_WAIT_MS = 5000;
/** subpixel 捨入容差 */
const EDGE_TOLERANCE_PX = 2;
/** 內建 7 個節目都唔夠 11 個：借第一個節目（definition + 圖）整假節目 */
const CLONE_PREFIX = 'e2e-show-';

/** 內建節目數（0 個節目嘅 catalog 會被拒，退返用內建） */
const BUNDLED_SHOWS = buildCatalogDocument({
    catalogDir: CATALOG_DIR.pathname,
    imageBase: '/',
}).shows.length;

/**
 * 節目數 → 預期（格數 = 節目 + 今日節目），手機同 iPad 直放都行晒。
 * 0 個節目（S-938）：catalog schema 要 shows 非空（packages/catalog parseCatalogDocument），成份拒絕，
 * app 用內建節目，所以產品入面唔會出現「淨今日節目 1 格」；呢度鎖住退返內建、照兩欄排。
 * 8 / 11 個節目 = 9 / 12 格：手機要分頁；iPad 直放（S-938）一頁放得晒、置頂（tabletPages）
 */
const CASES = [
    { shows: 0, tiles: BUNDLED_SHOWS + 1, columns: 2, span: (BUNDLED_SHOWS + 1) % 2 === 1 },
    { shows: 1, columns: 1, span: false },
    { shows: 2, columns: 2, span: true },
    { shows: 4, columns: 2, span: true },
    { shows: 7, columns: 2, span: false },
    { shows: 8, columns: 2, span: true, tabletPages: 1 },
    { shows: 11, columns: 2, span: false, tabletPages: 1 },
];

/** 由內建 catalog 截 / 補到 count 個節目（補嘅借第一個節目，id / 名唔同） */
const catalogWithShows = (base, count) => {
    const imageBase = new URL(CATALOG_FOLDER, base).pathname;
    const doc = buildCatalogDocument({ catalogDir: CATALOG_DIR.pathname, imageBase });
    const [donor] = doc.shows;
    const lastOrder = Math.max(...doc.shows.map((s) => s.definition.order));
    const extras = Array.from({ length: Math.max(0, count - doc.shows.length) }, (_, i) => ({
        ...donor,
        id: `${CLONE_PREFIX}${i + 1}`,
        definition: {
            ...donor.definition,
            name: `E2E 節目 ${i + 1}`,
            order: lastOrder + i + 1,
        },
    }));
    // 0 個：照寫 shows: []（app 會拒絕成份 catalog）
    return JSON.stringify({ ...doc, shows: [...doc.shows, ...extras].slice(0, count) });
};

/** 量今日節目格嗰頁：欄數、今日節目同第一格嘅闊、頁內容闊、分頁、一頁時有冇置頂 */
const measureGrid = (p) =>
    p.evaluate(
        ({ nav, today }) => {
            const pager = document.querySelector(`nav[aria-label="${nav}"]`);
            const tiles = [...pager.querySelectorAll('button')].filter(
                (b) => b.parentElement?.parentElement?.parentElement === pager,
            );
            const todayTile = tiles.find((b) => b.textContent?.includes(today));
            const grid = todayTile.parentElement;
            const style = getComputedStyle(grid);
            const contentWidth =
                grid.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const first = grid.firstElementChild.getBoundingClientRect();
            const last = grid.lastElementChild.getBoundingClientRect();
            const gridBox = grid.getBoundingClientRect();
            return {
                tiles: tiles.length,
                todayHeight: todayTile.getBoundingClientRect().height,
                // 第一頁第一格（今日節目可能自己一頁）：填滿時每行一樣高
                firstHeight: tiles[0].getBoundingClientRect().height,
                columns: style.gridTemplateColumns.split(' ').length,
                todayWidth: todayTile.getBoundingClientRect().width,
                firstWidth: first.width,
                contentWidth,
                pages: pager.firstElementChild.children.length,
                paged: grid.hasAttribute('data-paged'),
                alignContent: style.alignContent,
                // 置頂：第一行貼住頁頂留白；最尾一格底同頁底之間仲有空位
                topGapPx: first.top - gridBox.top - parseFloat(style.paddingTop),
                bottomRoomPx: gridBox.bottom - parseFloat(style.paddingBottom) - last.bottom,
            };
        },
        { nav: SHOWS_NAV, today: TODAY_LABEL },
    );

const near = (a, b) => Math.abs(a - b) <= EDGE_TOLERANCE_PX;

/**
 * S-935：扮未量到（每頁拎走 data-fill 同 inline 行高，格返用 CSS 16:9），橫跨嘅今日節目要同第一格一樣高
 * （以前兩倍比例會高咗欄距 × 9 / 32）。拎走之後 React 唔會加返（冇 resize），量完就收 context
 */
const measureUnfilledSpan = (p) =>
    p.evaluate(
        ({ nav, today }) => {
            const pager = document.querySelector(`nav[aria-label="${nav}"]`);
            const grids = [...pager.firstElementChild.children];
            grids.forEach((grid) => {
                grid.removeAttribute('data-fill');
                grid.style.removeProperty('grid-template-rows');
            });
            const todayTile = [...pager.querySelectorAll('button')].find((b) =>
                b.textContent?.includes(today),
            );
            return {
                todayHeight: todayTile.getBoundingClientRect().height,
                tileHeight: grids[0].firstElementChild.getBoundingClientRect().height,
            };
        },
        { nav: SHOWS_NAV, today: TODAY_LABEL },
    );

const checkCount = async (
    env,
    device,
    viewport,
    { shows, tiles = shows + 1, columns, span, tabletPages },
) => {
    const { log } = env;
    const label =
        shows === 0
            ? `直版節目格（${device}，0 個節目 → 用內建 ${BUNDLED_SHOWS} 個）`
            : `直版節目格（${device}，${shows} 個節目 + 今日節目）`;
    const { p } = await openWithCatalog(env, {
        catalogBody: catalogWithShows(env.base, shows),
        contextOptions: { viewport },
    });
    await p.goto(env.base);
    const nav = p.getByRole('navigation', { name: SHOWS_NAV });
    await nav.getByRole('button', { name: new RegExp(`^${TODAY_LABEL}`) }).waitFor({
        timeout: GRID_WAIT_MS,
    });
    const m = await measureGrid(p);
    log(m.tiles === tiles, `${label}：${m.tiles} 格全部出（預期 ${tiles}，今日節目喺最尾）`);
    log(m.columns === columns, `${label}：${m.columns} 欄（預期 ${columns}）`);
    // 一欄或者橫跨：今日節目成行咁闊；否則同第一格一樣闊（半行）
    const fullRow = span || columns === 1;
    const todayFull = near(m.todayWidth, m.contentWidth);
    log(
        todayFull === fullRow && (fullRow || near(m.todayWidth, m.firstWidth)),
        `${label}：今日節目${fullRow ? '成行咁闊' : '同其他格一樣闊'}` +
            `（${Math.round(m.todayWidth)} / 內容 ${Math.round(m.contentWidth)}px）`,
    );
    log(
        near(m.todayHeight, m.firstHeight),
        `${label}：今日節目同其他格一樣高（${m.todayHeight.toFixed(1)} / ${m.firstHeight.toFixed(1)}px）`,
    );
    if (span) {
        const u = await measureUnfilledSpan(p);
        log(
            u.tileHeight > 0 && near(u.todayHeight, u.tileHeight),
            `${label}：未量到時橫跨嘅今日節目都同 16:9 格一樣高` +
                `（${u.todayHeight.toFixed(1)} / ${u.tileHeight.toFixed(1)}px，S-935）`,
        );
    }
    if (viewport === TABLET_PORTRAIT && tabletPages !== undefined) {
        log(m.pages === tabletPages, `${label}：${m.pages} 頁（預期 ${tabletPages}）`);
    }
    if (m.pages > 1) {
        log(
            m.paged && m.alignContent === 'space-between',
            `${label}：分 ${m.pages} 頁，照 space-between`,
        );
        return;
    }
    log(
        !m.paged && m.alignContent !== 'space-between' && near(m.topGapPx, 0),
        `${label}：一頁放得晒，置頂（align-content ${m.alignContent}，底留 ${Math.round(m.bottomRoomPx)}px）`,
    );
};

export const runShowGridCountChecks = async (env) => {
    const devices = [
        ['手機', PHONE],
        ['iPad 直放', TABLET_PORTRAIT],
    ];
    for (const [device, viewport] of devices) {
        for (const c of CASES) {
            await runSection(
                env.log,
                `直版節目格 ${device} ${c.shows} 個節目`,
                () => checkCount(env, device, viewport, c),
                env.browser,
            );
        }
    }
};
