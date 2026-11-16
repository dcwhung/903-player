// 節目 / 劇集資料（P9.5 #12，_mockups_/catalog-item-info A 修訂版）e2e：
// 真 catalog 未有簡介 / 主持 / 聲演 / 播放時間，所以用 remote catalog（remoteCatalog.mjs 同一條 route）
// 答一份加咗示範資料嘅 catalog.json：公子會 + 在晴朗的一天出發（節目）、蘭茜夫人劇場（劇集 + 戀愛二分一）。
// 檢查：節目頁第一次入自動彈 sheet、ⓘ 位置、橫版右欄；全集 sheet 箭咀展開 / 收合（減少動態直接切換）、
// 揀未聽短篇彈短篇 sheet；今日節目表箭咀、第一次展開之後收合、橫版標題列
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { isShown, runSection, succeeds } from './harness.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, openWithCatalog } from './remoteCatalog.mjs';

const WAIT_MS = 5000;
const ABSENT_WAIT_MS = 1500;
/** 展開 / 收合過場（tokens.css --view-transition-fade 260ms）之後先量 */
const SETTLE_MS = 600;
const LANDSCAPE = { viewport: { width: 1280, height: 800 } };
/** ⓘ 離畫面右邊（同頁頭返回掣離左邊一樣，--space-3 × --ui-scale；直版 ui-scale 1） */
const INFO_RIGHT_GAP_PX = 12;
const GAP_TOLERANCE_PX = 2;
/** banner 16:9 高度 × 0.75（tokens.css --info-banner-ratio 64 / 27） */
const BANNER_RATIO = 64 / 27;
const BANNER_RATIO_TOLERANCE = 0.03;

const SHOW_AIR_TIME = '逢星期六（23:00 - 23:45）播放';
const SHOW_SUMMARY = '（e2e 示範簡介）公子會節目簡介';
const TODAY_SUMMARY = '（e2e 示範簡介）在晴朗的一天出發節目簡介';
const DRAMA_SUMMARY = '（e2e 示範簡介）蘭茜夫人劇場劇集簡介';
const ARC_WITH_INFO = '戀愛二分一';
const ARC_SUMMARY = '（e2e 示範簡介）戀愛二分一短篇簡介';
/** 多啲名：直版全集 sheet 行、橫版今日節目行嘅 chip 一定要換行（V2 / V3） */
const MANY_HOSTS = ['主持丙', '主持丁', '主持戊', '主持己', '主持庚', '主持辛'];
const MANY_CAST = ['聲演甲', '聲演乙', '聲演丙', '聲演丁', '聲演戊', '聲演己'];
/**
 * 行資料字大細（_mockups_/catalog-item-info t9-l-open / a7-n-progress）：播放時間 / 簡介 13px、chip 12px，
 * 橫版（--ui-scale 1.5）都唔放大
 */
const INLINE_TEXT_PX = 13;
const INLINE_CHIP_PX = 12;
/** 標籤同第一粒 chip 喺同一行：兩個中線相差唔超過呢個 */
const SAME_LINE_PX = 4;

const SHOW_EXTRA = {
    gongzi: {
        airTime: { start: '23:00', end: '23:45' },
        hosts: ['主持甲', '主持乙'],
        summary: SHOW_SUMMARY,
    },
    sunnyday: {
        airTime: { start: '06:00', end: '09:00' },
        hosts: MANY_HOSTS,
        summary: TODAY_SUMMARY,
    },
};

const withArcInfo = (arc) =>
    arc.name === ARC_WITH_INFO ? { ...arc, cast: MANY_CAST, summary: ARC_SUMMARY } : arc;

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
    openWithCatalog(env, { catalogBody: json, contextOptions });

const infoSheet = (p, name) => p.getByRole('dialog', { name });
const viewportWidth = (p) => p.viewportSize().width;

/** banner 16:9 貼 sheet 頂、左右貼邊；名疊喺 banner 入面 */
const checkBanner = async (env, sheet, label) => {
    const banner = sheet.getByTestId('info-banner');
    const [b, s] = await Promise.all([banner.boundingBox(), sheet.boundingBox()]);
    const flush =
        b !== null &&
        s !== null &&
        Math.abs(b.y - s.y) <= GAP_TOLERANCE_PX &&
        Math.abs(b.x - s.x) <= GAP_TOLERANCE_PX &&
        Math.abs(b.x + b.width - (s.x + s.width)) <= GAP_TOLERANCE_PX;
    const ratio = b ? b.width / b.height : 0;
    env.log(
        flush && Math.abs(ratio - BANNER_RATIO) < BANNER_RATIO_TOLERANCE,
        `${label}：banner 貼 sheet 頂、左右貼邊、64:27（${ratio.toFixed(2)}）`,
    );
    // ✕ 疊喺 banner 右上角（全集 sheet 都由表頭搬上嚟）
    const close = await sheet.getByRole('button', { name: '關閉' }).boundingBox();
    const onCorner =
        b !== null &&
        close !== null &&
        close.y >= b.y &&
        close.y + close.height <= b.y + b.height / 2 &&
        close.x + close.width <= b.x + b.width &&
        close.x >= b.x + b.width / 2;
    env.log(onCorner, `${label}：✕ 喺 banner 右上角`);
};

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
    log(!text.includes('播放時間'), '節目資料：播放時間喺 banner 細字，唔再出「播放時間」段');
    await checkBanner(env, sheet, '節目資料');
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
    await checkBanner(env, sheet, '節目資料橫版');
    // 撳左欄任何掣（呢度：第一個集數收藏星）右欄 sheet 自動閂
    await p
        .getByRole('region', { name: '集數' })
        .getByRole('button', { name: /收藏/ })
        .first()
        .click();
    // 收埋動畫（T6）完先 unmount：等佢走，唔係即刻當冇
    const closed = await succeeds(sheet.waitFor({ state: 'detached', timeout: WAIT_MS }));
    env.log(closed, '節目資料橫版：撳左欄掣，右欄 sheet 自動閂');
    // ⓘ 離畫面右邊同直版一樣計法：同頁頭返回掣離左邊一樣（--space-3 × --ui-scale），唔再讓開把手預留位
    const info = await p.getByRole('button', { name: '節目資料' }).boundingBox();
    const back = await p.getByRole('button', { name: '返回主頁' }).first().boundingBox();
    const gap = info ? viewportWidth(p) - (info.x + info.width) : -1;
    env.log(
        back !== null && Math.abs(gap - back.x) <= GAP_TOLERANCE_PX,
        `節目資料橫版：ⓘ 離右邊 ${gap.toFixed(1)}px（返回掣離左邊 ${back?.x.toFixed(1)}px）`,
    );
};

/**
 * 一行展開資料（InlineItemInfo）嘅量度：字大細、播放時間幾多行、標籤 vs 第一粒 chip 中線差、
 * chip 排咗幾多行、資料區右邊
 */
const inlineMetrics = (info) =>
    info.evaluate((el) => {
        const center = (box) => box.top + box.height / 2;
        const text = el.querySelector('p');
        const list = el.querySelector('ul');
        const role = list && document.getElementById(list.getAttribute('aria-labelledby'));
        const chips = list ? [...list.querySelectorAll('li')] : [];
        const firstChip = chips[0]?.getBoundingClientRect();
        const style = text && getComputedStyle(text);
        return {
            textPx: style ? parseFloat(style.fontSize) : 0,
            chipPx: chips[0] ? parseFloat(getComputedStyle(chips[0]).fontSize) : 0,
            firstLines: style
                ? Math.round(text.getBoundingClientRect().height / parseFloat(style.lineHeight))
                : 0,
            roleOffset:
                role && firstChip
                    ? Math.abs(center(role.getBoundingClientRect()) - center(firstChip))
                    : -1,
            chipRows: new Set(chips.map((li) => Math.round(li.getBoundingClientRect().top))).size,
            right: el.getBoundingClientRect().right,
        };
    });

/** 標籤喺第一行最左，chip 滿咗先換行（唔係標籤自己一行） */
const logLabelFlow = (log, label, m) =>
    log(
        m.chipRows > 1 && m.roleOffset >= 0 && m.roleOffset <= SAME_LINE_PX,
        `${label}：標籤同第一粒 chip 同一行、chip 換行（中線差 ${m.roleOffset.toFixed(1)}px、chip ${m.chipRows} 行）`,
    );

/** 資料區右邊同播放掣右邊對齊（用盡成行闊度，用戶 2026-11-16） */
const logFullWidth = (log, label, infoRight, play) => {
    const gap = play ? play.x + play.width - infoRight : Number.NaN;
    log(
        Math.abs(gap) <= GAP_TOLERANCE_PX,
        `${label}：資料區伸到播放掣下面、右邊對齊播放掣（差 ${gap.toFixed(1)}px）`,
    );
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
    if (cast) {
        const info = castList(p).locator('xpath=ancestor::*[@data-role="item-info"][1]');
        const m = await inlineMetrics(info);
        logLabelFlow(log, `${label}聲演`, m);
        const play = await info
            .locator('xpath=ancestor::li[1]')
            .locator('button:not([data-role="pick"])')
            .first()
            .boundingBox();
        logFullWidth(log, `${label}短篇行`, m.right, play);
    }
    await checkBanner(env, arcSheet(p), `${label}：全集 sheet`);
    await dramaToggle(p).click();
    if (!reducedMotion) await p.waitForTimeout(SETTLE_MS);
    const rows = await arcSheet(p)
        .locator('[data-expanded]')
        .first()
        .evaluate((el) => getComputedStyle(el).gridTemplateRows);
    log(rows === '0px', `${label}：撳箭咀收埋（grid-template-rows ${rows}）`);
    return p;
};

/** 橫版全集 sheet（docked 左欄）：頂部劇集 banner 貼頂、左右貼邊（G1） */
const checkArcSheetLandscape = async (env, json) => {
    const { p } = await open(env, json, LANDSCAPE);
    await p.goto(`${env.base}#/drama/lancy`);
    await arcSheet(p).waitFor({ timeout: WAIT_MS });
    await checkBanner(env, arcSheet(p), '劇集資料橫版：全集 sheet');
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
    if (shown) {
        const banner = await sheet.getByTestId('info-banner').innerText();
        env.log(
            /最新上架：|\d+ 個短篇/.test(banner),
            `劇集資料：banner 細字（${banner.replaceAll('\n', ' / ')}）`,
        );
        await checkBanner(env, sheet, '劇集資料');
    }
};

const todayToggle = (p) =>
    p.getByRole('region', { name: '節目表' }).getByRole('button', { name: '節目資料' });

/** 今日節目行資料：字大細跟 mockup、播放時間一行、資料區伸到播放掣下面、主持標籤同 chip 同一行 */
const checkTodayInline = async (env, p, label) => {
    const { log } = env;
    await p.waitForTimeout(SETTLE_MS);
    const row = p.locator('li[data-today-row]').filter({ hasText: TODAY_SUMMARY });
    const m = await inlineMetrics(row.locator('[data-role="item-info"]'));
    log(
        Math.abs(m.textPx - INLINE_TEXT_PX) < 0.5 && Math.abs(m.chipPx - INLINE_CHIP_PX) < 0.5,
        `${label}：資料字 ${m.textPx}px（${INLINE_TEXT_PX}px）、chip ${m.chipPx}px（${INLINE_CHIP_PX}px）`,
    );
    log(m.firstLines === 1, `${label}：播放時間一行放得落（${m.firstLines} 行）`);
    // 資料區伸到收藏 / 播放掣下面：右邊同播放掣 icon 右邊對齊（行掣最尾嗰個 svg）
    const play = await row.locator('button').first().locator(':scope > svg').last().boundingBox();
    logFullWidth(log, label, m.right, play);
    logLabelFlow(log, `${label}主持`, m);
};

/** 今日節目表：第一次入展開、有資料；再入（記住睇過）收合；橫版有標題列 */
const checkToday = async (env, json, contextOptions, label) => {
    const { log } = env;
    const { p } = await open(env, json, contextOptions);
    await p.goto(`${env.base}#/today`);
    await todayToggle(p).waitFor({ timeout: WAIT_MS });
    const first = await todayToggle(p).getAttribute('aria-expanded');
    const shown = await isShown(p.getByText(TODAY_SUMMARY), { timeout: WAIT_MS });
    log(first === 'true' && shown, `${label}：第一次入節目表展開資料（${first}、簡介 ${shown}）`);
    if (shown) await checkTodayInline(env, p, label);
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
    await section('節目資料：全集 sheet 橫版', () => checkArcSheetLandscape(env, json));
    await section('節目資料：今日節目直版', () => checkToday(env, json, {}, '今日節目資料'));
    await section('節目資料：今日節目橫版', () =>
        checkToday(env, json, LANDSCAPE, '今日節目資料橫版'),
    );
};
