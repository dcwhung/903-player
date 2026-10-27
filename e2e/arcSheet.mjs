// 全集表（ArcSheet）向下拉閂 e2e：手機尺寸（390×844），觸控同滑鼠各做一次。
// useSheetDrag 有兩條路：清單以外（grab bar / header）用 pointer（滑鼠、手指都係），
// 清單入面用 touch（捲到頂再向下拉先由表接手）。觸控 context 兩條路都測，滑鼠 context 測 header pointer。
import { newE2EContext } from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const SIZE = `${PHONE.width}×${PHONE.height}`;
// 短篇劇集（kind: series）：第一次入頁冇進度，全集表會自己彈出
const DRAMA_ROUTE = '#/drama/chisee';
// 同 src/config/constants.ts DRAMA_AUDIO_BASE 一樣：e2e 唔出外網，劇集音檔一律 404
const DRAMA_AUDIO_BASE = 'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev';

// 拉過表高咁多先閂（同 src/components/ArcSheet/sheetDrag.ts SHEET_DISMISS_RATIO 一樣）
const SHEET_DISMISS_RATIO = 0.25;
// 拉唔夠：門檻一半，肯定彈返
const SNAP_BACK_RATIO = SHEET_DISMISS_RATIO / 2;
// 拉夠：門檻再加咁多 px，唔會因為量高度 / 捨入差少少而唔閂
const DISMISS_MARGIN_PX = 40;
// 放手前停定咁耐：長過 VELOCITY_WINDOW_MS（src/components/ShowCardStack/cardStack.ts，100ms），
// 速度當 0，閂唔閂淨係睇距離（唔會變咗「甩」）
const HOLD_BEFORE_RELEASE_MS = 200;
// 跟手指位移容差（px）：清單路要郁過 DRAG_INTENT_PX 先接手，起點會遲少少
const FOLLOW_TOLERANCE_PX = 16;
const STEPS = 10;
const STEP_MS = 16;
// 放手後等滑走 / 彈返動畫（SHEET_SLIDE_MS 250ms）同 onClose 完
const SETTLE_MS = 700;
// 起手點喺清單頂下面咁多 px（第一行入面）
const LIST_GRIP_OFFSET_PX = 30;

const sheetOf = (p) => p.getByRole('dialog', { name: '全集' });

const centreOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** 表而家嘅 inline transform（拉緊 translateY(Npx)；放手彈返清空） */
const sheetTransform = (p) => sheetOf(p).evaluate((el) => el.style.transform);

/** translateY(Npx) 嘅 N；冇就 0 */
const translateYOf = (transform) => Number(/translateY\(([\d.]+)px\)/.exec(transform)?.[1] ?? 0);

/**
 * 一下拖動：start → 逐格 move 到 dy → 量一次拖緊嘅 transform → 停定 HOLD_BEFORE_RELEASE_MS → 放手 → 等動畫完。
 * input 係 { down, move, up }，觸控 / 滑鼠共用；返回拖緊時嘅 transform
 */
const dragDown = async (p, input, { x, y }, dy) => {
    await input.down(x, y);
    for (let i = 1; i <= STEPS; i += 1) {
        await input.move(x, y + (dy * i) / STEPS);
        await p.waitForTimeout(STEP_MS);
    }
    const during = await sheetTransform(p);
    await p.waitForTimeout(HOLD_BEFORE_RELEASE_MS);
    await input.up(x, y + dy);
    await p.waitForTimeout(SETTLE_MS);
    return during;
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
    const during = await dragDown(p, input, await GRIPS[grip](p), dy);
    const followed = Math.abs(translateYOf(during) - dy) <= FOLLOW_TOLERANCE_PX;
    log(followed, `${label}：拉 ${dy}px 時表跟手指（${during}）`);
    const stillOpen = (await sheetOf(p).count()) === 1;
    const after = stillOpen ? await sheetTransform(p) : '(冇表)';
    log(
        stillOpen && after === '',
        `${label}：拉 ${dy}px（< 表高 ${height.toFixed(0)} × ${SHEET_DISMISS_RATIO}）放手彈返，仍然開住（transform「${after}」）`,
    );
};

/** 拉過門檻（表高 × SHEET_DISMISS_RATIO + DISMISS_MARGIN_PX）放手：表閂咗 */
const checkDismiss = async (env, grip, label) => {
    const { p, log, input } = env;
    if (!(await openSheet(env, label))) return;
    const height = (await sheetOf(p).boundingBox()).height;
    const dy = Math.round(height * SHEET_DISMISS_RATIO) + DISMISS_MARGIN_PX;
    await dragDown(p, input, await GRIPS[grip](p), dy);
    const count = await sheetOf(p).count();
    log(
        count === 0,
        `${label}：拉 ${dy}px（≥ 表高 ${height.toFixed(0)} × ${SHEET_DISMISS_RATIO}）放手，全集表閂咗`,
    );
};

/** 開一個劇集頁；劇集音檔 404（唔出外網） */
const openDramaPage = async (browser, errors, base, options) => {
    const ctx = await newE2EContext(browser, { viewport: PHONE, colorScheme: 'dark', ...options });
    await ctx.route(`${DRAMA_AUDIO_BASE}/**`, (route) => route.fulfill({ status: 404, body: '' }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${base}${DRAMA_ROUTE}`);
    return { ctx, p };
};

/** 全集表拉閂：觸控（header pointer + 清單 touch）同滑鼠（header pointer），各測彈返同閂 */
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
    }
    await touch.ctx.close();

    const mouse = await openDramaPage(browser, errors, base, { deviceScaleFactor: 2 });
    const mouseEnv = { p: mouse.p, log, tap: false, input: mouseInput(mouse.p) };
    const label = `${SIZE} 滑鼠全集表（表頭）`;
    await checkSnapBack(mouseEnv, 'header', label);
    await checkDismiss(mouseEnv, 'header', label);
    await mouse.ctx.close();
};
