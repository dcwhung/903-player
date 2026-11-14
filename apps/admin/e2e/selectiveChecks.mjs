// Admin e2e section：選擇發佈（admin 0.3.0，mockup _mockups_/admin-selective-publish/index.html Q1–Q4）
// 由 run.mjs 傳入共用 helper（check / newPage / shoot / loggedIn / BASE），回返 check function 清單

const NEXT = '下一步：確認發佈';
const LOVE_AFTER = '發佈戀愛後二分一';
const APP_TEXT = '發佈名稱與簡介';

const assertChecked = async (box, expected, what) => {
    if ((await box.isChecked()) !== expected) throw new Error(`${what} checked != ${expected}`);
};

export const selectiveChecks = ({ check, newPage, shoot, loggedIn, BASE }) => {
    const footer = (page) => page.locator('.savebar .muted.small');

    /** ① 更新頁：有必須處理都可以下一步；預設勾選（Q1）；Q4 灰掣；只發佈勾咗嘅（App 外觀冇勾 = 草稿留低） */
    const selectivePublishCheck = (browser) =>
        check(
            'selective publish: incomplete row does not block, only ticked items go out',
            async () => {
                const state = loggedIn({ selective: true });
                const page = await newPage(browser, state);
                await page.goto(BASE);
                await page.getByRole('heading', { level: 2, name: /App 外觀/ }).waitFor();
                const text = page.getByRole('checkbox', { name: APP_TEXT });
                const love = page.getByRole('checkbox', { name: LOVE_AFTER });
                await assertChecked(text, true, '名稱與簡介');
                await assertChecked(love, true, '戀愛後二分一');
                if ((await page.getByRole('checkbox', { name: '發佈App 圖示' }).count()) > 0)
                    throw new Error('unchanged App 圖示 should not be listed');
                const camp = page.getByRole('row', { name: /大衛營/ });
                await camp.getByTitle('大衛營（尚未設定排期）').getByText('未完成').waitFor();
                if ((await camp.getByRole('checkbox').count()) > 0)
                    throw new Error('incomplete row should have no checkbox');
                await footer(page).getByText('已選擇 2 項發佈 · 1 項未完成（不會發佈）').waitFor();
                const next = page.getByRole('button', { name: NEXT });
                if (await next.isDisabled())
                    throw new Error('must-fix row should not block 下一步');
                await shoot(page, 'update-selective');

                // Q4：乜都唔揀、又冇其他改動 → 灰掣 +「未選擇任何內容」
                await text.uncheck();
                await love.uncheck();
                await footer(page).getByText('未選擇任何內容').waitFor();
                if (!(await next.isDisabled())) throw new Error('下一步 should be disabled (Q4)');
                await shoot(page, 'update-selective-none');

                await love.check();
                await footer(page).getByText('已選擇 1 項發佈 · 1 項未完成（不會發佈）').waitFor();
                await next.click();

                // ② 確認發佈（B v2）：今次項目喺時間線（按劇分卡）、本次發佈淨留未完成；reload 照用 URL 嘅選擇
                const card = page.getByRole('region', { name: '本次發佈' });
                const timeline = page.getByRole('region', { name: '上線時間' });
                const lancyCard = timeline.locator('.tl-entry').filter({ hasText: '蘭茜夫人劇場' });
                await lancyCard.locator('.tl-row').getByText('戀愛後二分一').waitFor();
                await lancyCard.getByText('第 1–20 集').waitFor();
                await page.reload();
                await card.getByText('以下項目尚未完成，不會在本次發佈').waitFor();
                if ((await card.getByText('新短篇').count()) > 0)
                    throw new Error('本次發佈 should no longer list content (timeline does)');
                if ((await page.getByText('App 外觀 · 名稱與簡介').count()) > 0)
                    throw new Error('unticked 名稱與簡介 listed on the publish page');
                if ((await timeline.locator('.tl-tag.look').count()) > 0)
                    throw new Error('unticked 名稱與簡介 has an App 外觀 card in the timeline');
                await shoot(page, 'publish-selective');
                await page.getByRole('button', { name: '發佈', exact: true }).click();
                await page.getByRole('heading', { name: '發佈 / 部署' }).waitFor();
                const sent = JSON.stringify(state.publishedSelections);
                const expected = JSON.stringify([
                    {
                        content: ['newArc/lancy/love-after'],
                        branding: { icon: false, text: false },
                        banner: false,
                    },
                ]);
                if (sent !== expected) throw new Error(`published selection: ${sent}`);
                if (state.branding.text === null)
                    throw new Error('unticked 名稱與簡介 draft was cleared');
                await page.close();
            },
        );

    /** App 外觀有改 → 確認發佈頁列出 + 重新部署提示；冇改 → 更新頁冇 App 外觀 section */
    const selectiveAppearanceCheck = (browser) =>
        check('selective publish: App 外觀 section only when changed, redeploy note', async () => {
            const plain = await newPage(browser, loggedIn());
            await plain.goto(BASE);
            await plain.getByRole('heading', { level: 2, name: /新內容/ }).waitFor();
            if ((await plain.getByRole('heading', { level: 2, name: /App 外觀/ }).count()) > 0)
                throw new Error('App 外觀 section shown without appearance changes');
            await plain.close();

            // 真圖：時間線卡頭用蘭茜碟面、短篇行用戀愛二分一自己嘅碟面
            const state = loggedIn({ selective: true, realImages: true });
            // 其他已儲存的改動（api 0.10.2）：劇本身換碟面、短篇戀愛二分一換橫圖，各自一項 edit
            const lancyRef = { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' };
            state.others = [
                { kind: 'edit', when: 'now', entry: lancyRef, detail: { fields: ['disc'] } },
                {
                    kind: 'edit',
                    when: 'now',
                    entry: lancyRef,
                    arc: { id: 'half', name: '戀愛二分一', label: '戀愛二分一' },
                    detail: { fields: ['tile'] },
                },
            ];
            const page = await newPage(browser, state);
            await page.goto(BASE);
            await page.getByRole('button', { name: NEXT }).click();
            const card = page.getByRole('region', { name: '本次發佈' });
            await card.getByText('App 外觀 · 名稱與簡介').waitFor();
            await card.getByText(/圖示、名稱及簡介須重新部署/).waitFor();
            if ((await card.getByText('蘭茜夫人劇場').count()) > 0)
                throw new Error('本次發佈 should not list other saved changes');
            // 時間線：App 外觀卡排即時上線最頂；蘭茜一張卡，「修改 · 劇集 · 碟面」+「修改 · 戀愛二分一 · 橫圖」
            const timeline = page.getByRole('region', { name: '上線時間' });
            const cards = timeline.locator('.tl-entry');
            await cards.first().getByText('重新部署播放器後生效').waitFor();
            const firstTag = await cards.first().locator('.tl-tag').textContent();
            if (firstTag !== 'App 外觀') throw new Error(`first card tag: ${firstTag}`);
            const lancyCard = cards.filter({ hasText: '蘭茜夫人劇場' });
            const rows = await lancyCard.locator('.tl-row').allTextContents();
            // 揀咗嘅新短篇同其他已儲存的改動都喺同一張卡（第一次出現嘅次序）
            const expected = '新短篇戀愛後二分一第 1–20 集|修改劇集碟面|修改戀愛二分一橫圖';
            if (rows.join('|') !== expected) throw new Error(`lancy rows: ${rows.join('|')}`);
            const arcDisc = await lancyCard
                .locator('.tl-row')
                .filter({ hasText: '戀愛二分一橫圖' })
                .locator('.thumb')
                .evaluate((el) => el.style.backgroundImage);
            if (!arcDisc.includes('lancy-half-disc.webp'))
                throw new Error(`arc row should show the arc disc: ${arcDisc}`);
            await shoot(page, 'publish-selective-appearance');
            // 發佈 / 部署記錄：同一行修改都寫埋改了哪些欄位
            await page.getByRole('button', { name: '發佈', exact: true }).click();
            await page.getByRole('heading', { name: '發佈 / 部署' }).waitFor();
            const changes = page.locator('.hist-row .changes');
            await changes.getByText('碟面', { exact: true }).first().waitFor();
            await changes.getByText('橫圖', { exact: true }).first().waitFor();
            // 只出一次（狀態 pill，S-998），唔再出原本 key「disc」
            const fieldTexts = changes.getByText('碟面', { exact: true });
            if ((await fieldTexts.count()) !== 1)
                throw new Error(`field list shown ${await fieldTexts.count()} times`);
            if ((await changes.getByText('disc', { exact: true }).count()) > 0)
                throw new Error('history still shows the raw field key');
            await shoot(page, 'history-change-fields');
            await page.close();
        });

    /** URL 帶住過時 key（422 unknown selection keys）→ 提示重新載入，「發佈」灰 */
    const selectiveStaleCheck = (browser) =>
        check('selective publish: stale selection keys ask to reload', async () => {
            const page = await newPage(browser, loggedIn({ selective: true }));
            const selection = {
                content: ['newArc/gone/x'],
                branding: { icon: false, text: false },
                banner: false,
            };
            await page.goto(
                `${BASE}/publish?${new URLSearchParams({ selection: JSON.stringify(selection) })}`,
            );
            await page.getByRole('button', { name: '重新載入' }).waitFor();
            if (!(await page.getByRole('button', { name: '發佈', exact: true }).isDisabled()))
                throw new Error('發佈 should be disabled on a stale page');
            await shoot(page, 'publish-selective-stale');
            await page.getByRole('button', { name: '重新載入' }).click();
            await page.getByRole('button', { name: NEXT }).waitFor();
            await page.close();
        });

    return [selectivePublishCheck, selectiveAppearanceCheck, selectiveStaleCheck];
};
