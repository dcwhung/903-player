// Admin e2e section：發佈 / 部署頁嘅還原進行中狀態、成功 toast、記錄載入失敗（AU-025）
// 由 run.mjs 傳入共用 helper（check / newPage / shoot / loggedIn / BASE），回返 check function 清單

const HIDPI = { deviceScaleFactor: 2 };
const ROLLBACK_ID = 2;
const OTHER_ID = 3;
const ROLLBACK_URL = new RegExp(`/api/publishes/${ROLLBACK_ID}/rollback$`);
const PUBLISHES_URL = /\/api\/publishes$/;
const SERVER_ERROR = 500;

const fulfilJson = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** 還原 = 發佈一個新版本（內容同 #ROLLBACK_ID），變成使用中 */
const rollBack = (state) => {
    const target = state.history.find((row) => row.id === ROLLBACK_ID);
    const publish = {
        ...target,
        id: state.history.length + state.publishes.length + 1,
        current: true,
        rollbackOf: ROLLBACK_ID,
    };
    state.publishes.unshift(publish);
    return publish;
};

/** 還原 request 扣住唔回，叫 release() 先放行；requests = 收到幾多次 */
const holdRollback = async (page, state) => {
    const held = { requests: 0, release: () => {} };
    const gate = new Promise((resolve) => {
        held.release = resolve;
    });
    await page.route(ROLLBACK_URL, async (route) => {
        held.requests += 1;
        await gate;
        await fulfilJson(route, { publish: rollBack(state) });
    });
    return held;
};

export const historyChecks = ({ check, newPage, shoot, loggedIn, BASE }) => {
    const rollbackButton = (page, id) => page.getByRole('button', { name: `還原至 #${id}` });
    const table = (page) => page.getByRole('table', { name: '發佈 / 部署' });

    const rollbackBusyCheck = (browser) =>
        check('history: rollback disables the actions while running, then toasts', async () => {
            const state = loggedIn();
            const page = await newPage(browser, state, undefined, HIDPI);
            const held = await holdRollback(page, state);
            await page.goto(`${BASE}/history`);
            await rollbackButton(page, ROLLBACK_ID).click();
            await page.getByRole('dialog').getByRole('button', { name: '還原' }).click();
            await page.getByRole('dialog').waitFor({ state: 'detached' });
            for (const id of [ROLLBACK_ID, OTHER_ID])
                if (!(await rollbackButton(page, id).isDisabled()))
                    throw new Error(`還原至 #${id} stays enabled while the rollback runs`);
            if ((await table(page).getAttribute('aria-busy')) !== 'true')
                throw new Error('the table is not aria-busy while the rollback runs');
            await shoot(page, 'history-rollback-busy');
            held.release();
            await page.getByRole('status').getByText(`已還原至 #${ROLLBACK_ID}`).waitFor();
            await shoot(page, 'history-rollback-done');
            if (await rollbackButton(page, ROLLBACK_ID).isDisabled())
                throw new Error('the actions stay disabled after the rollback');
            if (held.requests !== 1) throw new Error(`rollback requests: ${held.requests}`);
            await page.close();
        });

    const loadFailedCheck = (browser) =>
        check('history: a failed load shows the reason and 重試, not the empty state', async () => {
            const page = await newPage(browser, loggedIn(), undefined, HIDPI);
            let failing = true;
            await page.route(PUBLISHES_URL, (route) =>
                failing
                    ? fulfilJson(route, { error: 'D1 unavailable' }, SERVER_ERROR)
                    : route.fallback(),
            );
            await page.goto(`${BASE}/history`);
            const alert = page.getByRole('alert').filter({ hasText: '載入失敗：' });
            await alert.waitFor();
            if ((await page.getByText('尚未有發佈記錄。').count()) > 0)
                throw new Error('a failed load still shows the empty state');
            await shoot(page, 'history-load-failed');
            failing = false;
            await alert.getByRole('button', { name: '重試' }).click();
            await rollbackButton(page, ROLLBACK_ID).waitFor();
            await alert.waitFor({ state: 'detached' });
            await page.close();
        });

    return [rollbackBusyCheck, loadFailedCheck];
};
