// Admin e2e section：編輯頁「未儲存就離開」守衛（AU-023）—— 側欄 / 上一頁問一問（留下 / 離開），
// 重新整理出瀏覽器原生提示；轉分頁、冇改動就唔問。
// 由 run.mjs 傳入共用 helper（check / newPage / shoot / loggedIn / BASE），回返 check function 清單

const SUMMARY = '未儲存的簡介';

export const leaveChecks = ({ check, newPage, shoot, loggedIn, BASE }) => {
    const summaryBox = (page) => page.getByRole('textbox', { name: '簡介' });
    const leaveDialog = (page) => page.getByRole('dialog', { name: '放棄未儲存的變更？' });
    const navLink = (page, name) =>
        page.getByRole('navigation', { name: '主選單' }).getByRole('link', { name, exact: true });

    const openDirty = async (browser) => {
        const page = await newPage(browser, loggedIn());
        // 由列表撳入去（app 內跳轉）：「上一頁」先係 router 管；直接 goto 兩次就係成頁重新載入，歸 beforeunload 管
        await page.goto(`${BASE}/dramas`);
        await page.getByRole('link', { name: '蘭茜夫人劇場', exact: true }).click();
        await page.waitForURL(`${BASE}/dramas/lancy`);
        // 真係打字（唔用 fill）：Chromium 要有 user activation 先出 beforeunload 提示
        await summaryBox(page).click();
        await page.keyboard.type(SUMMARY);
        return page;
    };

    const assertDraftKept = async (page) => {
        if (!(await summaryBox(page).inputValue()).includes(SUMMARY))
            throw new Error('the unsaved draft was lost');
    };

    const leaveDialogCheck = (browser) =>
        check('leave guard: nav and back ask before dropping unsaved changes', async () => {
            const page = await openDirty(browser);

            // 側欄：問；留下 = 草稿仲喺度
            await navLink(page, '節目').click();
            await leaveDialog(page).waitFor();
            await shoot(page, 'leave-guard-dialog');
            await leaveDialog(page).getByRole('button', { name: '留下' }).click();
            await leaveDialog(page).waitFor({ state: 'detached' });
            await assertDraftKept(page);

            // 上一頁：問
            await page.goBack();
            await leaveDialog(page).waitFor();
            await leaveDialog(page).getByRole('button', { name: '留下' }).click();
            if (!page.url().endsWith('/dramas/lancy')) throw new Error(`url: ${page.url()}`);
            await assertDraftKept(page);

            // 轉分頁：草稿保留，唔問
            await page.getByRole('link', { name: /^短篇/ }).click();
            await page.waitForURL(/\/dramas\/lancy\/arcs/);
            if ((await leaveDialog(page).count()) > 0) throw new Error('tab switch was blocked');
            await page.getByRole('link', { name: '基本資料' }).click();
            await assertDraftKept(page);

            // 離開：真係走
            await navLink(page, '節目').click();
            await leaveDialog(page).getByRole('button', { name: '離開' }).click();
            await page.waitForURL(`${BASE}/shows`);
            await page.close();
        });

    const beforeUnloadCheck = (browser) =>
        check('leave guard: reload prompts only while there are unsaved changes', async () => {
            const prompts = [];
            const watch = (page) =>
                page.on('dialog', (dialog) => {
                    prompts.push(dialog.type());
                    void dialog.dismiss();
                });

            // 冇改動：reload 唔問
            const clean = await newPage(browser, loggedIn());
            watch(clean);
            await clean.goto(`${BASE}/dramas/lancy`);
            await summaryBox(clean).waitFor();
            await clean.reload();
            await summaryBox(clean).waitFor();
            if (prompts.length > 0) throw new Error('a clean editor prompted on reload');
            await clean.close();

            // 有未儲存改動：原生提示；dismiss = 留喺度，草稿仲喺度
            const page = await openDirty(browser);
            watch(page);
            const prompted = page.waitForEvent('dialog');
            await page.evaluate(() => window.location.reload());
            await prompted;
            if (prompts.join() !== 'beforeunload') throw new Error(`prompts: ${prompts.join()}`);
            await assertDraftKept(page);
            await page.close();
        });

    return [leaveDialogCheck, beforeUnloadCheck];
};
