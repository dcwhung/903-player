// 節目 / 劇集資料（P9.5 #12，_mockups_/catalog-item-info A 修訂版）e2e：
// 真 catalog 未有簡介 / 主持 / 聲演 / 播放時間，所以用 remote catalog（remoteCatalog.mjs 同一條 route）
// 答一份加咗示範資料嘅 catalog.json：公子會 + 在晴朗的一天出發（節目）、蘭茜夫人劇場（劇集 + 戀愛二分一）。
// 檢查：節目頁第一次入自動彈 sheet、ⓘ 位置、橫版右欄；全集 sheet 箭咀展開 / 收合（減少動態直接切換）、
// 揀未聽短篇彈短篇 sheet；今日節目表箭咀、第一次展開之後收合、橫版標題列
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { isShown, runSection } from './harness.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, openWithCatalog } from './remoteCatalog.mjs';

const WAIT_MS = 5000;
const ABSENT_WAIT_MS = 1500;
/** 展開 / 收合過場（tokens.css --view-transition-fade 260ms）之後先量 */
const SETTLE_MS = 600;
const LANDSCAPE = { viewport: { width: 1280, height: 800 } };
/** ⓘ 離畫面右邊（同頁頭返回掣離左邊一樣，--space-3 × --ui-scale；直版 ui-scale 1） */
const INFO_RIGHT_GAP_PX = 12;
const GAP_TOLERANCE_PX = 2;

const SHOW_AIR_TIME = '星期六（23:00 - 23:45）';
const SHOW_SUMMARY = '（e2e 示範簡介）公子會節目簡介';
const TODAY_SUMMARY = '（e2e 示範簡介）在晴朗的一天出發節目簡介';
const DRAMA_SUMMARY = '（e2e 示範簡介）蘭茜夫人劇場劇集簡介';
const ARC_WITH_INFO = '戀愛二分一';
const ARC_SUMMARY = '（e2e 示範簡介）戀愛二分一短篇簡介';

const SHOW_EXTRA = {
    gongzi: {
        airTime: { start: '23:00', end: '23:45' },
        hosts: ['主持甲', '主持乙'],
        summary: SHOW_SUMMARY,
    },
    sunnyday: {
        airTime: { start: '06:00', end: '09:00' },
        hosts: ['主持丙'],
        summary: TODAY_SUMMARY,
    },
};

const withArcInfo = (arc) =>
    arc.name === ARC_WITH_INFO ? { ...arc, cast: ['聲演甲', '聲演乙'], summary: ARC_SUMMARY } : arc;

/** 內建 catalog + 示範資料（airTime 要合規：最長 3 小時，唔係成份 catalog 被拒、fallback 內建） */
const infoDocument = (base) => {
    const imageBase = new URL(CATALOG_FOLDER, base).pathname;
    const doc = buildCatalogDocument({ catalogDir: CATALOG_DIR.pathname, imageBase });
    const shows = doc.shows.map((s) =>
        SHOW_EXTRA[s.id] ? { ...s, definition: { ...s.definition, ...SHOW_EXTRA[s.id] } } : s,
    );
    const dramas = doc.dramas.map((d) =>
        d.id === 'lancy'
            ? {
                  ...d,
                  definition: {
                      ...d.definition,
                      summary: DRAMA_SUMMARY,
                      arcs: d.definition.arcs.map(withArcInfo),
                  },
              }
            : d,
    );
    return JSON.stringify({ ...doc, shows, dramas });
};

const open = (env, json, contextOptions) =>
    openWithCatalog(env, { catalogBody: json }, contextOptions);

const infoSheet = (p, name) => p.getByRole('dialog', { name });
const viewportWidth = (p) => p.viewportSize().width;

/** 節目頁直版：第一次入自動彈、內容、ⓘ 位置、閂咗撳 ⓘ 開返 */
const checkShowPortrait = async (env, json) => {
    const { log } = env;
    const { p } = await open(env, json);
    await p.goto(`${env.base}#/show/gongzi`);
    const sheet = infoSheet(p, '節目資料');
    const popped = await isShown(sheet, { timeout: WAIT_MS });
    log(popped, '節目資料：第一次入節目頁自動彈資料 sheet');
    const text = popped ? await sheet.innerText() : '';
    log(
        text.includes(SHOW_AIR_TIME) && text.includes('主持甲') && text.includes(SHOW_SUMMARY),
        `節目資料：sheet 有播放時間、主持、簡介（${text.replaceAll('\n', ' / ')}）`,
    );
    await sheet.getByRole('button', { name: '關閉' }).click();
    const info = p.getByRole('button', { name: '節目資料' });
    const box = await info.boundingBox();
    const gap = box ? viewportWidth(p) - (box.x + box.width) : -1;
    log(
        Math.abs(gap - INFO_RIGHT_GAP_PX) <= GAP_TOLERANCE_PX,
        `節目資料：ⓘ 離右邊 ${gap.toFixed(1)}px（${INFO_RIGHT_GAP_PX}px）`,
    );
    await info.click();
    log(await isShown(sheet, { timeout: WAIT_MS }), '節目資料：撳 ⓘ 再開到 sheet');
};

/** 節目頁橫版：sheet 喺右欄（唱片嗰欄），唔蓋左欄清單、冇遮罩 */
const checkShowLandscape = async (env, json) => {
    const { p } = await open(env, json, LANDSCAPE);
    await p.goto(`${env.base}#/show/gongzi`);
    const sheet = infoSheet(p, '節目資料');
    await sheet.waitFor({ timeout: WAIT_MS });
    const list = await p.getByRole('region', { name: '集數' }).boundingBox();
    const box = await sheet.boundingBox();
    env.log(
        list !== null && box !== null && box.x >= list.x + list.width,
        `節目資料橫版：sheet 喺右欄（sheet x ${box?.x.toFixed(0)}，清單右邊 ${list ? (list.x + list.width).toFixed(0) : '?'}）`,
    );
    const backdrop = await isShown(p.getByTestId('info-sheet-backdrop'), {
        timeout: ABSENT_WAIT_MS,
    });
    env.log(!backdrop, '節目資料橫版：冇遮罩，左欄清單照撳得');
};

const arcSheet = (p) => p.getByRole('dialog', { name: '全集' });
const dramaToggle = (p) => arcSheet(p).getByRole('button', { name: '劇集資料' });
const castList = (p) => arcSheet(p).getByRole('list', { name: '聲演' });

/** 全集 sheet：第一次入展開；撳箭咀收埋（減少動態：即刻收埋，唔等過場） */
const checkArcSheet = async (env, json, reducedMotion) => {
    const { log } = env;
    const label = reducedMotion ? '劇集資料（減少動態）' : '劇集資料';
    const { p } = await open(env, json, reducedMotion ? { reducedMotion: 'reduce' } : {});
    await p.goto(`${env.base}#/drama/lancy`);
    await arcSheet(p).waitFor({ timeout: WAIT_MS });
    const expanded = await dramaToggle(p).getAttribute('aria-expanded');
    const cast = await isShown(castList(p), { timeout: WAIT_MS });
    const summary = await isShown(arcSheet(p).getByText(DRAMA_SUMMARY), { timeout: WAIT_MS });
    log(
        expanded === 'true' && cast && summary,
        `${label}：第一次入全集 sheet 展開（箭咀 ${expanded}、聲演 ${cast}、劇集簡介 ${summary}）`,
    );
    await dramaToggle(p).click();
    if (!reducedMotion) await p.waitForTimeout(SETTLE_MS);
    const rows = await arcSheet(p)
        .locator('[data-expanded]')
        .first()
        .evaluate((el) => getComputedStyle(el).gridTemplateRows);
    log(rows === '0px', `${label}：撳箭咀收埋（grid-template-rows ${rows}）`);
    return p;
};

/** 揀未聽過又有資料嘅短篇：彈嗰個短篇嘅資料 sheet */
const checkArcPick = async (env, json) => {
    const p = await checkArcSheet(env, json, false);
    await arcSheet(p)
        .getByRole('button', { name: new RegExp(`^${ARC_WITH_INFO}，`) })
        .click();
    const sheet = infoSheet(p, '劇集資料');
    const shown = await isShown(sheet, { timeout: WAIT_MS });
    const text = shown ? await sheet.innerText() : '';
    env.log(
        text.includes(ARC_WITH_INFO) && text.includes(ARC_SUMMARY) && text.includes('聲演甲'),
        `劇集資料：揀未聽短篇彈短篇 sheet（${text.replaceAll('\n', ' / ')}）`,
    );
};

const todayToggle = (p) =>
    p.getByRole('region', { name: '節目表' }).getByRole('button', { name: '節目資料' });

/** 今日節目表：第一次入展開、有資料；再入（記住睇過）收合；橫版有標題列 */
const checkToday = async (env, json, contextOptions, label) => {
    const { log } = env;
    const { p } = await open(env, json, contextOptions);
    await p.goto(`${env.base}#/today`);
    await todayToggle(p).waitFor({ timeout: WAIT_MS });
    const first = await todayToggle(p).getAttribute('aria-expanded');
    const shown = await isShown(p.getByText(TODAY_SUMMARY), { timeout: WAIT_MS });
    log(first === 'true' && shown, `${label}：第一次入節目表展開資料（${first}、簡介 ${shown}）`);
    await p.reload();
    await todayToggle(p).waitFor({ timeout: WAIT_MS });
    const again = await todayToggle(p).getAttribute('aria-expanded');
    log(again === 'false', `${label}：再入節目表預設收合（${again}）`);
};

export const runItemInfoChecks = async (env) => {
    const json = infoDocument(env.base);
    const section = (label, run) => runSection(env.log, label, run, env.browser);
    await section('節目資料：節目頁直版', () => checkShowPortrait(env, json));
    await section('節目資料：節目頁橫版', () => checkShowLandscape(env, json));
    await section('節目資料：全集 sheet', () => checkArcPick(env, json));
    await section('節目資料：全集 sheet 減少動態', () => checkArcSheet(env, json, true));
    await section('節目資料：今日節目直版', () => checkToday(env, json, {}, '今日節目資料'));
    await section('節目資料：今日節目橫版', () =>
        checkToday(env, json, LANDSCAPE, '今日節目資料橫版'),
    );
};
