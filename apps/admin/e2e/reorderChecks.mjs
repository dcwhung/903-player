// Admin e2e section：排序改動（admin 0.8.0，#6 決定 A）—— 確認發佈頁一張「節目排序已更改」卡 +「還原」
// → 確認框（一項「排序」）→ POST /api/order/shows/revert；冇發佈版本 409；上下架記錄出「廣播劇排序已更改」。
// 由 run.mjs 傳入共用 helper（check / newPage / shoot / loggedIn / BASE），回返 check function 清單
const HIDPI = { deviceScaleFactor: 2 };
const SHOWS_TITLE = '節目排序已更改';
const SHOWS_REVERT = '還原節目排序';

const assertEqual = (actual, expected, what) => {
    const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
    if (a !== e) throw new Error(`${what}: ${a} !== ${e}`);
};

const reorderCard = (page) =>
    page
        .getByRole('region', { name: '上線時間' })
        .locator('.tl-entry')
        .filter({ hasText: SHOWS_TITLE });

export const reorderChecks = ({ check, newPage, shoot, loggedIn, BASE }) => {
    const reorderState = () => loggedIn({ reorder: true });

    const publishReorderCheck = (browser) =>
        check('reorder: publish page reverts the whole show list via the dialog', async () => {
            const state = reorderState();
            const page = await newPage(browser, state, undefined, HIDPI);
            await page.goto(`${BASE}/publish`);
            const card = reorderCard(page);
            await card.getByRole('button', { name: SHOWS_REVERT }).waitFor();
            await card.locator('.tl-tag.edit', { hasText: '修改' }).waitFor();
            if ((await card.getByRole('checkbox').count()) > 0)
                throw new Error('a reorder card should have no publish checkbox');
            if (await page.getByRole('button', { name: '發佈' }).isDisabled())
                throw new Error('a reorder alone should be publishable');
            await shoot(page, 'publish-reorder');

            await card.getByRole('button', { name: SHOWS_REVERT }).click();
            const dialog = page.getByRole('dialog', { name: '還原排序？' });
            if (!(await dialog.getByRole('checkbox', { name: '還原排序' }).isChecked()))
                throw new Error('排序 should be ticked by default');
            await dialog.getByRole('button', { name: '還原 1 項' }).waitFor();
            await shoot(page, 'reorder-revert-dialog');
            await dialog.getByRole('button', { name: '還原 1 項' }).click();
            await page.getByText('已還原排序').waitFor();
            assertEqual(state.orderReverts, ['shows'], 'order revert requests');
            await card.waitFor({ state: 'detached' });
            await page.close();
        });

    const reorderNotPublishedCheck = (browser) =>
        check('reorder: 409 notPublished keeps the dialog open with a message', async () => {
            const state = { ...reorderState(), history: [] };
            const page = await newPage(browser, state);
            await page.goto(`${BASE}/publish`);
            await reorderCard(page).getByRole('button', { name: SHOWS_REVERT }).click();
            const dialog = page.getByRole('dialog', { name: '還原排序？' });
            await dialog.getByRole('button', { name: '還原 1 項' }).click();
            await dialog.getByRole('alert').getByText('此項目尚未發佈，無法還原').waitFor();
            assertEqual(state.orderReverts, [], 'order revert requests');
            await page.close();
        });

    const historyReorderCheck = (browser) =>
        check('reorder: history names a reorder row by its list, with no entry', async () => {
            const page = await newPage(browser, reorderState(), undefined, HIDPI);
            await page.goto(`${BASE}/history`);
            const line = page.locator('.hist-row .name', { hasText: '廣播劇排序已更改' });
            await line.waitFor();
            const row = page.locator('.hist-row').filter({ has: line });
            if ((await row.locator('.changes .thumb').count()) > 0)
                throw new Error('a reorder row should have no thumbnail');
            await shoot(page, 'history-reorder');
            await page.close();
        });

    return [publishReorderCheck, reorderNotPublishedCheck, historyReorderCheck];
};
