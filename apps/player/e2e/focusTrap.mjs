// aria-modal bottom sheet 嘅 Tab 循環（P10 lane 6c，src/components/shared/common/Sheet/sheetFocusTrap.ts）：
// 由表本身一路撳 Tab 行勻一圈都唔會出表外（<body> / 背後嘅掣）；最尾 Tab → 最頭、最頭 Shift+Tab → 最尾；
// 焦點跌咗去 <body> 再撳 Tab 會返入表。ArcSheet（arcSheet.mjs）同 ListSheet（square.mjs）共用

// 同 src sheetFocusTrap 嘅 TABBABLE_SELECTOR 一樣意思（e2e 係純 node，import 唔到 TS）；
// 呢度只係揀「最頭 / 最尾」，判斷有冇行出表外唔靠佢
const TABBABLE =
    'a[href], button:not(:disabled), input:not(:disabled), select, textarea, [tabindex]';

/** 數表入面見到、Tab 會停嘅元素，最頭 / 最尾加 data-e2e-tab 標記方便之後認 */
const markEnds = (dialog) =>
    dialog.evaluate((el, selector) => {
        const list = [...el.querySelectorAll(selector)].filter(
            (n) => n.tabIndex >= 0 && n.checkVisibility(),
        );
        list.at(0)?.setAttribute('data-e2e-tab', 'first');
        list.at(-1)?.setAttribute('data-e2e-tab', 'last');
        return list.length;
    }, TABBABLE);

/** 焦點而家喺邊：表入面嘅 first / last / 其他（in），定係表外（out：連 <body>） */
const where = (dialog) =>
    dialog.evaluate((el) => {
        const active = document.activeElement;
        if (!active || !el.contains(active)) return `out:${active?.tagName ?? '-'}`;
        return active.getAttribute('data-e2e-tab') ?? 'in';
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
    await dialog.locator('[data-e2e-tab="last"]').focus();
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
            afterLast === 'first' &&
            afterFirst === 'last' &&
            fromBody === 'first',
        `${label}：Tab 困喺表入面（${count} 粒、撳 ${steps.length} 下 Tab 出咗表 ${escaped.length} 次 ${escaped.join(' ')}；` +
            `最尾 Tab → ${afterLast}、最頭 Shift+Tab → ${afterFirst}、<body> Tab → ${fromBody}）`,
    );
};
