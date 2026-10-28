// 全集表（ArcSheet）向下拉閂 e2e：手機尺寸（390×844），觸控同滑鼠各做一次。
// useSheetDrag 有兩條路：清單以外（grab bar / header）用 pointer（滑鼠、手指都係），
// 清單入面用 touch（捲到頂再向下拉先由表接手）。觸控 context 兩條路都測，滑鼠 context 測 header pointer。
import { newE2EContext } from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const SIZE = `${PHONE.width}×${PHONE.height}`;
// 短篇劇集（kind: series）：第一次入頁冇進度，全集表會自己彈出
const DRAMA_ROUTE = '#/drama/chisee';
// 以下 export 嘅常數係手抄 src（e2e 係純 node，import 唔到 TS），由 scripts/e2eSrcConstants.test.ts 鎖住一致
// 拉過表高咁多先閂（src/components/ArcSheet/sheetDrag.ts SHEET_DISMISS_RATIO）
export const SHEET_DISMISS_RATIO = 0.25;
// 速度只計放手前咁多 ms 入面嘅樣本（src/components/ShowCardStack/cardStack.ts VELOCITY_WINDOW_MS）
export const VELOCITY_WINDOW_MS = 100;
// 清單路要郁過咁多 px 先睇得出方向、由表接手（src/hooks/swipe.ts DRAG_INTENT_PX）
export const DRAG_INTENT_PX = 10;
// 放手前向下甩得咁快（px/ms）兼拉過咁多 px，唔夠距離都閂（src/components/ArcSheet/sheetDrag.ts）
export const SHEET_FLICK_VELOCITY_PX_PER_MS = 0.6;
export const SHEET_FLICK_MIN_PX = 24;
// 拉唔夠：門檻一半，肯定彈返
const SNAP_BACK_RATIO = SHEET_DISMISS_RATIO / 2;
// 拉夠：門檻再加咁多 px，唔會因為量高度 / 捨入差少少而唔閂
const DISMISS_MARGIN_PX = 40;
// 放手前停定咁耐：VELOCITY_WINDOW_MS 兩倍，窗口只剩放手樣本，
// 速度當 0，閂唔閂淨係睇距離（唔會變咗「甩」）
const HOLD_BEFORE_RELEASE_MS = VELOCITY_WINDOW_MS * 2;
// 跟手指位移容差（px）：清單路要郁過 DRAG_INTENT_PX 先接手，起點會遲少少（再加少少捨入位）
const FOLLOW_TOLERANCE_PX = DRAG_INTENT_PX + 6;
const STEPS = 10;
const STEP_MS = 16;
// 甩：門檻四分三（仍然唔夠距離），兩格拉完、唔停即刻放手。
// CDP 每下 touchMove 等一個 frame 先返（機忙時 30–50ms）：四格 82px 量到嘅速度只有約 0.56 px/ms，
// 唔夠 SHEET_FLICK_VELOCITY_PX_PER_MS；兩格各約 60px，就算每格隔成個 VELOCITY_WINDOW_MS 都仲有 0.6
const FLING_RATIO = 0.75;
const FLING_STEPS = 2;
// 清單未捲到頂：先捲落咁多 px，再向下拉 LIST_PULL_PX（少過捲咗嘅距離，成個手勢都未到頂）
const LIST_SCROLLED_PX = 200;
const LIST_PULL_PX = 120;
// 清單未捲到頂向下拉：清單最少要捲返咁多（瀏覽器捲，唔係表接手）
const LIST_MIN_SCROLL_BACK_PX = LIST_PULL_PX / 2;
// 放手後最多等咁耐表定落嚟（閂：滑走 SHEET_SLIDE_MS 250ms + onClose；彈返：即刻清 transform）
const SETTLE_TIMEOUT_MS = 5000;
// 起手點喺清單頂下面咁多 px（第一行入面）
const LIST_GRIP_OFFSET_PX = 30;

const sheetOf = (p) => p.getByRole('dialog', { name: '全集' });

const centreOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** 表而家嘅 inline transform（拉緊 translateY(Npx)；放手彈返清空） */
const sheetTransform = (p) => sheetOf(p).evaluate((el) => el.style.transform);

/** translateY(Npx) 嘅 N；冇就 0 */
const translateYOf = (transform) => Number(/translateY\(([\d.]+)px\)/.exec(transform)?.[1] ?? 0);

/**
 * 放手後等表定落嚟，唔用固定 sleep（S-529）：
 * 閂 → 表由 DOM 移走；彈返 → inline transform 清空、冇 data-dragging / data-closing。
 * 返回 'closed' / 'open'；等唔到（例如卡喺拖緊）就 'stuck'，交畀斷言報錯
 */
const waitSettled = async (p, sheet) => {
    const settled = await p
        .waitForFunction(
            (el) =>
                !el.isConnected ||
                (el.style.transform === '' &&
                    !el.hasAttribute('data-dragging') &&
                    !el.hasAttribute('data-closing')),
            sheet,
            { timeout: SETTLE_TIMEOUT_MS },
        )
        .then(() => true)
        .catch(() => false);
    if (!settled) return 'stuck';
    return (await sheet.evaluate((el) => el.isConnected)) ? 'open' : 'closed';
};

/** 拖緊嗰刻：表嘅 inline transform、有冇 data-dragging、清單 scrollTop */
const measureDrag = (sheet) =>
    sheet.evaluate((el) => ({
        transform: el.style.transform,
        dragging: el.hasAttribute('data-dragging'),
        scrollTop: el.querySelector('[data-role="sheet-list"]')?.scrollTop ?? 0,
    }));

/** 慢慢拉兼停定先放（速度 0，淨係睇距離）；fling：幾格拉完即刻放手（甩） */
const SLOW = { steps: STEPS, stepMs: STEP_MS, holdMs: HOLD_BEFORE_RELEASE_MS };
const FLING = { steps: FLING_STEPS, stepMs: 0, holdMs: 0 };

/**
 * 一下拖動：start → 逐格 move 到 dy → 量一次拖緊嘅樣（measureDrag）→ 停定 holdMs → 放手 → 等表定落嚟。
 * input 係 { down, move, up }，觸控 / 滑鼠共用；返回拖緊時嘅量度同放手後狀態（waitSettled）。
 * fling 唔量（evaluate 要時間，會拖慢最後一格同放手之間）
 */
const dragDown = async (p, input, { x, y }, dy, { steps, stepMs, holdMs } = SLOW) => {
    const sheet = await sheetOf(p).elementHandle();
    await input.down(x, y);
    for (let i = 1; i <= steps; i += 1) {
        await input.move(x, y + (dy * i) / steps);
        if (stepMs > 0) await p.waitForTimeout(stepMs);
    }
    const during = holdMs > 0 ? await measureDrag(sheet) : undefined;
    if (holdMs > 0) await p.waitForTimeout(holdMs);
    await input.up(x, y + dy);
    const settled = await waitSettled(p, sheet);
    await sheet.dispose();
    return { during, settled };
};

/** 一隻手指（CDP Input.dispatchTouchEvent）：page.touchscreen 只識 tap，拖動要自己發 touchMove */
const touchInput = (cdp) => {
    const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    return {
        down: (x, y) => send('touchStart', [{ x, y }]),
        move: (x, y) => send('touchMove', [{ x, y }]),
        up: () => send('touchEnd', []),
    };
};

/** 滑鼠左掣（pointerType mouse）：只行 header pointer 路 */
const mouseInput = (p) => ({
    down: async (x, y) => {
        await p.mouse.move(x, y);
        await p.mouse.down();
    },
    move: (x, y) => p.mouse.move(x, y),
    up: async (x, y) => {
        await p.mouse.move(x, y);
        await p.mouse.up();
    },
});

/** 起手點：header 用表題中間；清單用第一行入面（先捲返頂，清單路要捲到頂先接手） */
const GRIPS = {
    header: async (p) => centreOf(await sheetOf(p).locator('header h2').boundingBox()),
    list: async (p) => {
        const list = sheetOf(p).locator('[data-role="sheet-list"]');
        await list.evaluate((el) => void (el.scrollTop = 0));
        const box = await list.boundingBox();
        return { x: box.x + box.width / 2, y: box.y + LIST_GRIP_OFFSET_PX };
    },
};

/** 表未開就撳「全集」掣開返；斷言表開咗兼喺原位（冇殘留 transform） */
const openSheet = async (env, label) => {
    const { p, log, tap } = env;
    if ((await sheetOf(p).count()) === 0) {
        const button = p.getByRole('button', { name: '全集', exact: true });
        await (tap ? button.tap() : button.click());
    }
    const visible = await sheetOf(p)
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    const transform = visible ? await sheetTransform(p) : '(冇表)';
    log(visible && transform === '', `${label}：全集表打開咗，喺原位（transform「${transform}」）`);
    return visible;
};

/** 拉唔夠門檻（表高 × SNAP_BACK_RATIO）放手：表跟手指，放手彈返、仍然開住 */
const checkSnapBack = async (env, grip, label) => {
    const { p, log, input } = env;
    if (!(await openSheet(env, label))) return;
    const height = (await sheetOf(p).boundingBox()).height;
    const dy = Math.round(height * SNAP_BACK_RATIO);
    const { during, settled } = await dragDown(p, input, await GRIPS[grip](p), dy);
    const followed = Math.abs(translateYOf(during.transform) - dy) <= FOLLOW_TOLERANCE_PX;
    log(followed, `${label}：拉 ${dy}px 時表跟手指（${during.transform}）`);
    log(
        settled === 'open',
        `${label}：拉 ${dy}px（< 表高 ${height.toFixed(0)} × ${SHEET_DISMISS_RATIO}）放手彈返原位，仍然開住（${settled}）`,
    );
};

/** 拉過門檻（表高 × SHEET_DISMISS_RATIO + DISMISS_MARGIN_PX）放手：表閂咗 */
const checkDismiss = async (env, grip, label) => {
    const { p, log, input } = env;
    if (!(await openSheet(env, label))) return;
    const height = (await sheetOf(p).boundingBox()).height;
    const dy = Math.round(height * SHEET_DISMISS_RATIO) + DISMISS_MARGIN_PX;
    const { settled } = await dragDown(p, input, await GRIPS[grip](p), dy);
    log(
        settled === 'closed',
        `${label}：拉 ${dy}px（≥ 表高 ${height.toFixed(0)} × ${SHEET_DISMISS_RATIO}）放手，全集表閂咗（${settled}）`,
    );
};

/** 甩：唔夠門檻嘅距離，快速拉完即刻放手 → 速度夠快，表照閂（Q-6） */
const checkFling = async (env, grip, label) => {
    const { p, log, input } = env;
    if (!(await openSheet(env, label))) return;
    const height = (await sheetOf(p).boundingBox()).height;
    const dy = Math.round(height * SHEET_DISMISS_RATIO * FLING_RATIO);
    const { settled } = await dragDown(p, input, await GRIPS[grip](p), dy, FLING);
    log(
        settled === 'closed' && dy >= SHEET_FLICK_MIN_PX,
        `${label}：快速甩 ${dy}px（≥ ${SHEET_FLICK_MIN_PX}px，< 表高 ${height.toFixed(0)} × ${SHEET_DISMISS_RATIO}）放手，全集表照閂（${settled}）`,
    );
};

/**
 * 清單未捲到頂向下拉（Q-6）：應該係瀏覽器捲清單，表唔接手（唔跟手指、冇 data-dragging），放手仍然開住。
 * 只得觸控有呢條路（清單入面用 touch；滑鼠喺清單入面唔拉表）
 */
const checkListScrollsFirst = async (env, label) => {
    const { p, log, input } = env;
    if (!(await openSheet(env, label))) return;
    const list = sheetOf(p).locator('[data-role="sheet-list"]');
    const before = await list.evaluate((el, top) => {
        el.scrollTop = top;
        return el.scrollTop;
    }, LIST_SCROLLED_PX);
    const box = await list.boundingBox();
    const grip = centreOf(box);
    const { during, settled } = await dragDown(p, input, grip, LIST_PULL_PX);
    const scrolledBack = before - during.scrollTop;
    log(
        before >= LIST_PULL_PX &&
            during.transform === '' &&
            !during.dragging &&
            scrolledBack >= LIST_MIN_SCROLL_BACK_PX,
        `${label}：清單捲咗 ${before}px 時向下拉 ${LIST_PULL_PX}px，捲返清單 ${scrolledBack}px，表冇跟手指（transform「${during.transform}」，dragging ${during.dragging}）`,
    );
    log(settled === 'open', `${label}：清單未到頂拉完放手，全集表仍然開住（${settled}）`);
};

/** 開一個劇集頁；劇集音檔 404 由 newE2EContext 處理（唔出外網） */
const openDramaPage = async (browser, errors, base, options) => {
    const ctx = await newE2EContext(browser, { viewport: PHONE, colorScheme: 'dark', ...options });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${base}${DRAMA_ROUTE}`);
    return { ctx, p };
};

/**
 * 全集表拉閂：觸控（header pointer + 清單 touch）同滑鼠（header pointer），各測彈返、閂同甩；
 * 觸控再測清單未捲到頂向下拉係捲清單
 */
export const runArcSheetChecks = async ({ browser, base, errors, log }) => {
    const touch = await openDramaPage(browser, errors, base, {
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
    });
    const cdp = await touch.ctx.newCDPSession(touch.p);
    const touchEnv = { p: touch.p, log, tap: true, input: touchInput(cdp) };
    for (const grip of ['header', 'list']) {
        const label = `${SIZE} 觸控全集表（${grip === 'header' ? '表頭' : '清單'}）`;
        await checkSnapBack(touchEnv, grip, label);
        await checkDismiss(touchEnv, grip, label);
        await checkFling(touchEnv, grip, label);
    }
    await checkListScrollsFirst(touchEnv, `${SIZE} 觸控全集表（清單未到頂）`);
    await touch.ctx.close();

    const mouse = await openDramaPage(browser, errors, base, { deviceScaleFactor: 2 });
    const mouseEnv = { p: mouse.p, log, tap: false, input: mouseInput(mouse.p) };
    const label = `${SIZE} 滑鼠全集表（表頭）`;
    await checkSnapBack(mouseEnv, 'header', label);
    await checkDismiss(mouseEnv, 'header', label);
    await checkFling(mouseEnv, 'header', label);
    await mouse.ctx.close();
};
