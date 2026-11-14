// Admin e2e section：還原未發佈改動（admin 0.7.0，mockup _mockups_/admin-revert/index.html ①②③）
// 由 run.mjs 傳入共用 helper（check / newPage / shoot / loggedIn / BASE），回返 check function 清單
import { HALF_SUMMARY } from './mockRevert.mjs';

const ARC = '戀愛二分一';
const ARC_REVERT = `還原${ARC}`;
const PUBLISHED_SUMMARY = '蘭茜夫人的廣播劇。';
const CURRENT_SUMMARY = '蘭茜夫人的懸疑廣播劇，逢星期一至五晚播出。';

const assertEqual = (actual, expected, what) => {
    const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
    if (a !== e) throw new Error(`${what}: ${a} !== ${e}`);
};

/** 圖片（url(...) 背景）全部讀完先影相 */
const waitForImages = (page) =>
    page.waitForFunction(() =>
        [...document.querySelectorAll('.img-box, .thumb')].every((el) => {
            const url = getComputedStyle(el).backgroundImage.match(/url\("(.+)"\)/)?.[1];
            if (!url) return true;
            const img = new Image();
            img.src = url;
            return img.complete;
        }),
    );

export const revertChecks = ({ check, newPage, shoot, loggedIn, BASE }) => {
    const revertState = () => loggedIn({ realImages: true, revert: true });

    /** ① 時間線行尾「還原」→ ② 確認框剔走簡介 → 淨還原橫圖；再還原簡介 → 成行冇咗 */
    const publishRevertCheck = (browser) =>
        check('revert: publish page reverts one arc field via the dialog', async () => {
            const state = revertState();
            const page = await newPage(browser, state);
            await page.goto(`${BASE}/publish`);
            const card = page
                .getByRole('region', { name: '上線時間' })
                .locator('.tl-entry')
                .filter({ hasText: '蘭茜夫人劇場' });
            const arcRow = card.locator('.tl-row').filter({ hasText: ARC });
            await arcRow.getByRole('button', { name: ARC_REVERT }).waitFor();
            const newArcRow = card.locator('.tl-row').filter({ hasText: '新短篇' });
            if ((await newArcRow.getByRole('button').count()) > 0)
                throw new Error('a new arc row should have no 還原');
            if ((await arcRow.getByRole('link').count()) > 0)
                throw new Error('the arc name should not be a link');
            await waitForImages(page);
            await shoot(page, 'publish-revert');

            await arcRow.getByRole('button', { name: ARC_REVERT }).click();
            const dialog = page.getByRole('dialog', { name: `${ARC_REVERT}？` });
            await dialog.getByText('選擇要還原至已發佈版本的項目：').waitFor();
            await dialog.getByRole('button', { name: '還原 2 項' }).waitFor();
            await dialog.getByText(HALF_SUMMARY.then).waitFor();
            await dialog.getByRole('checkbox', { name: '還原簡介' }).uncheck();
            await waitForImages(page);
            await shoot(page, 'revert-dialog');
            await dialog.getByRole('button', { name: '還原 1 項' }).click();
            await page.getByText(`已還原${ARC}`).waitFor();
            assertEqual(
                state.reverts.map((r) => [r.body, r.ifMatch]),
                [[{ items: [{ arc: 'half', field: 'tile' }] }, '"lancy-v1"']],
                'revert request',
            );
            await arcRow.getByText('橫圖', { exact: true }).waitFor({ state: 'detached' });
            await arcRow.getByText('簡介', { exact: true }).waitFor();

            await arcRow.getByRole('button', { name: ARC_REVERT }).click();
            await page.getByRole('dialog').getByRole('button', { name: '還原 1 項' }).click();
            await arcRow.waitFor({ state: 'detached' });
            await shoot(page, 'publish-revert-done');
            await page.close();
        });

    /** ③ 編輯頁：欄位旁「已修改」「還原」、「已發佈：…」、圖位圓形還原掣；有未儲存改動唔准還原 */
    const editorRevertCheck = (browser) =>
        check('revert: editor marks changed fields in place and reverts one', async () => {
            const state = revertState();
            const page = await newPage(browser, state);
            await page.goto(`${BASE}/dramas/lancy`);
            const button = page.getByRole('button', { name: '還原簡介' });
            await button.waitFor();
            await page.getByText(`已發佈：${PUBLISHED_SUMMARY}`).waitFor();
            await page.getByRole('button', { name: '還原碟面' }).waitFor();
            if ((await page.getByRole('button', { name: '還原橫圖' }).count()) > 0)
                throw new Error('unchanged 橫圖 should have no revert');
            await waitForImages(page);
            await shoot(page, 'editor-revert');

            const summary = page.getByRole('textbox', { name: '簡介' });
            await summary.fill('未儲存');
            if (!(await button.isDisabled())) throw new Error('還原 should wait for unsaved edits');
            await summary.fill(CURRENT_SUMMARY);
            await button.click();
            const dialog = page.getByRole('dialog', { name: '還原簡介？' });
            await dialog.getByRole('button', { name: '還原 1 項' }).click();
            await page.getByText('已還原簡介').waitFor();
            assertEqual(
                state.reverts.at(-1).body,
                { items: [{ field: 'summary' }] },
                'revert body',
            );
            await button.waitFor({ state: 'detached' });
            if ((await summary.inputValue()) !== PUBLISHED_SUMMARY)
                throw new Error('the editor did not reload the reverted summary');

            await page.goto(`${BASE}/dramas/lancy/arcs#half`);
            await page.getByRole('button', { name: '還原橫圖' }).waitFor();
            await page.getByText(`已發佈：${HALF_SUMMARY.then}`).waitFor();
            await waitForImages(page);
            await shoot(page, 'editor-revert-arc');
            await page.close();
        });

    return [publishRevertCheck, editorRevertCheck];
};
