// aria-modal bottom sheet 嘅 Tab 循環（P10 lane 6c，src/components/shared/common/Sheet/sheetFocusTrap.ts）：
// 由表本身一路撳 Tab 行勻一圈都唔會出表外（<body> / 背後嘅掣）；最尾 Tab → 最頭、最頭 Shift+Tab → 最尾；
// 焦點跌咗去 <body> 再撳 Tab 會返入表。ArcSheet（arcSheet.mjs）、ListSheet（square.mjs）、
// ItemInfoSheet（itemInfo.mjs，表入面只得 ✕ 一粒）共用

// 同 src sheetFocusTrap 嘅 TABBABLE_SELECTOR 一樣意思（e2e 係純 node，import 唔到 TS）；
// 呢度只係揀「最頭 / 最尾」，判斷有冇行出表外唔靠佢
const TABBABLE =
    'a[href], button:not(:disabled), input:not(:disabled), select, textarea, [tabindex]';

/**
 * 數表入面見到、Tab 會停嘅元素，最頭 / 最尾各自加標記（data-e2e-tab-first / -last）方便之後認。
 * 分開兩個 attribute：表入面只得 1 粒（例如資料表淨係 ✕）時佢同時係最頭同最尾，唔會互相覆蓋
 */
const markEnds = (dialog) =>
    dialog.evaluate((el, selector) => {
        const list = [...el.querySelectorAll(selector)].filter(
            (n) => n.tabIndex >= 0 && n.checkVisibility(),
        );
        list.at(0)?.setAttribute('data-e2e-tab-first', '');
        list.at(-1)?.setAttribute('data-e2e-tab-last', '');
        return list.length;
    }, TABBABLE);

/**
 * 焦點而家喺邊：表入面嘅 first / last（只得 1 粒就 first+last）/ 其他（in），
 * 定係表外（out：連 <body>）
 */
const where = (dialog) =>
    dialog.evaluate((el) => {
        const active = document.activeElement;
        if (!active || !el.contains(active)) return `out:${active?.tagName ?? '-'}`;
        const ends = ['first', 'last'].filter((end) => active.hasAttribute(`data-e2e-tab-${end}`));
        return ends.join('+') || 'in';
    });

/** where() 嘅結果係咪最頭 / 最尾（只得 1 粒時兩樣都係） */
const isEnd = (position, end) => position.split('+').includes(end);

/**
 * 焦點而家喺邊（讀屏名，冇就字）：<body> / 冇就 'body'。
 * 自動開嘅表（冇撳過掣）閂咗要返入口掣，唔好跌去 <body>（用戶 2026-11-18 決定）
 */
export const focusedName = (p) =>
    p.evaluate(() => {
        const el = document.activeElement;
        if (el === null || el === document.body) return 'body';
        return `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent?.trim() ?? ''}`;
    });

/**
 * 表要已經開住、滑定。由表本身開始撳 count + 2 下 Tab（行勻一圈再多兩步），每步焦點都要喺表入面；
 * 再測兩頭循環同由 <body> 返入表
 */
export const checkTabWrap = async (p, dialog, log, label) => {
    const count = await markEnds(dialog);
    await dialog.evaluate((el) => el.focus({ preventScroll: true }));
    const steps = [];
    for (let i = 0; i < count + 2; i += 1) {
        await p.keyboard.press('Tab');
        steps.push(await where(dialog));
    }
    const escaped = steps.filter((s) => s.startsWith('out'));
    await dialog.locator('[data-e2e-tab-last]').focus();
    await p.keyboard.press('Tab');
    const afterLast = await where(dialog);
    await p.keyboard.press('Shift+Tab');
    const afterFirst = await where(dialog);
    await p.evaluate(() => document.activeElement?.blur());
    await p.keyboard.press('Tab');
    const fromBody = await where(dialog);
    log(
        count > 0 &&
            escaped.length === 0 &&
            isEnd(afterLast, 'first') &&
            isEnd(afterFirst, 'last') &&
            isEnd(fromBody, 'first'),
        `${label}：Tab 困喺表入面（${count} 粒、撳 ${steps.length} 下 Tab 出咗表 ${escaped.length} 次 ${escaped.join(' ')}；` +
            `最尾 Tab → ${afterLast}、最頭 Shift+Tab → ${afterFirst}、<body> Tab → ${fromBody}）`,
    );
};

// 等遮罩真係喺嗰點最頂（表升起 / 遮罩淡入、overlay inert 期間未必）最多咁耐
const SCRIM_READY_MS = 3000;

/**
 * 遮罩上面、表以外嘅一點（撳 / tap 閂表用）：遮罩頂同表頂中間。
 * 等到嗰點最頂嘅元素係遮罩先返（onScrim）；等唔到 onScrim false，log 講明撳錯嘢
 */
export const scrimPoint = async (p, backdrop, dialog) => {
    const scrim = await backdrop.elementHandle();
    const sheet = await dialog.elementHandle();
    const handle = await p
        .waitForFunction(
            ([b, s]) => {
                const scrimBox = b.getBoundingClientRect();
                const point = {
                    x: scrimBox.x + scrimBox.width / 2,
                    y: (scrimBox.y + s.getBoundingClientRect().y) / 2,
                };
                return document.elementFromPoint(point.x, point.y) === b && point;
            },
            [scrim, sheet],
            { timeout: SCRIM_READY_MS },
        )
        .catch(() => null);
    const point = handle ? await handle.jsonValue() : { x: 0, y: 0 };
    await Promise.all([scrim.dispose(), sheet.dispose(), handle?.dispose()]);
    return { ...point, onScrim: handle !== null };
};

/**
 * C-025（Code Review 2026-11-18 p10-lane6c）：用戶只接受鍵盤閂見到入口掣嘅 focus ring。
 * 自動開嘅表用滑鼠 / 觸控閂（撳遮罩、向下拉）：入口掣唔可以被搬焦點、唔可以 :focus-visible；
 * 之後再用滑鼠 / 觸控開閂（有 opener，焦點返入口掣）都唔可以黐住 ring
 */
export const checkNoPointerRing = async (entry, log, label, { focusAllowed = false } = {}) => {
    const { focused, ring } = await entry.evaluate((el) => ({
        focused: document.activeElement === el,
        ring: el.matches(':focus-visible'),
    }));
    log(
        (focusAllowed || !focused) && !ring,
        `${label}：入口掣${focusAllowed ? '' : '冇被搬焦點、'}冇 focus ring（焦點 ${focused}、:focus-visible ${ring}）`,
    );
};
