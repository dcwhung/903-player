// Admin e2e section：改劇集 ID（AU-013）—— server 連自動編號嘅短篇 ID（<舊 ID>-NN）同排程一齊改，
// 儲存嘅 PUT 要帶新短篇 ID（否則 409 arcScheduled）；rename 成功但 PUT 失敗 → 留喺新 ID、草稿仲喺度，再儲存直接 PUT。
// 由 run.mjs 傳入共用 helper（check / newPage / shoot / loggedIn / BASE），回返 check function 清單
import { SCANNED_ID } from './mockRename.mjs';

const NEW_ID = 'newdrama';
const RENAMED_ARC_IDS = [`${NEW_ID}-01`, 'special'];
const SUMMARY = '未儲存的簡介';

const assertEqual = (actual, expected, what) => {
    const [a, e] = [JSON.stringify(actual), JSON.stringify(expected)];
    if (a !== e) throw new Error(`${what}: ${a} !== ${e}`);
};

const arcIdsOf = (definition) => definition.arcs.map((arc) => arc.id);

const idBox = (page) => page.getByRole('textbox', { name: /^ID/ });
const saveButton = (page) => page.getByRole('button', { name: '儲存' });

export const renameChecks = ({ check, newPage, shoot, loggedIn, BASE }) => {
    const openScanned = async (browser, state) => {
        const page = await newPage(browser, state);
        await page.goto(`${BASE}/dramas/${SCANNED_ID}`);
        await idBox(page).fill(NEW_ID);
        return page;
    };

    const renameSaveCheck = (browser) =>
        check('rename drama ID: the save keeps the arc IDs the server renamed', async () => {
            const state = loggedIn({ rename: true });
            const page = await openScanned(browser, state);
            await page.getByRole('textbox', { name: '簡介' }).fill(SUMMARY);
            await saveButton(page).click();
            await page.waitForURL(`${BASE}/dramas/${NEW_ID}`);
            await page.getByText(/有未儲存的變更/).waitFor({ state: 'detached' });
            if ((await page.getByRole('alert').count()) > 0)
                throw new Error(
                    `save failed: ${await page.getByRole('alert').first().innerText()}`,
                );
            assertEqual(state.renames, [{ from: SCANNED_ID, to: NEW_ID }], 'rename requests');
            assertEqual(
                state.puts.map((put) => [put.id, arcIdsOf(put.body.definition)]),
                [[NEW_ID, RENAMED_ARC_IDS]],
                'PUT after the rename',
            );
            assertEqual(Object.keys(state.schedules).at(-1), `${NEW_ID}/${NEW_ID}-01`, 'schedule');
            await page.close();
        });

    // S-1396：淨係改 ID → rename 已經存晒，唔送 PUT（failPuts 留低冇用過 = 冇 PUT 去到 server）
    const renameOnlyCheck = (browser) =>
        check('rename drama ID: a rename-only save sends no PUT and shows no error', async () => {
            const state = loggedIn({ rename: true });
            state.failPuts = 1;
            const page = await openScanned(browser, state);
            await saveButton(page).click();
            await page.waitForURL(`${BASE}/dramas/${NEW_ID}`);
            await page.getByText(/有未儲存的變更/).waitFor({ state: 'detached' });
            assertEqual(await idBox(page).inputValue(), NEW_ID, 'ID field');
            assertEqual(await page.getByRole('alert').count(), 0, 'alerts');
            assertEqual(state.renames, [{ from: SCANNED_ID, to: NEW_ID }], 'rename requests');
            assertEqual([state.puts.length, state.failPuts], [0, 1], 'PUTs sent / refusals left');
            const renamed = state.entries.find((entry) => entry.id === NEW_ID);
            assertEqual(arcIdsOf(renamed.definition), RENAMED_ARC_IDS, 'stored arc IDs');
            await page.close();
        });

    const renameFailedPutCheck = (browser) =>
        check(
            'rename drama ID: a failed PUT stays on the new ID, saving again is a plain PUT',
            async () => {
                const state = loggedIn({ rename: true });
                state.failPuts = 1;
                const page = await openScanned(browser, state);
                await page.getByRole('textbox', { name: '簡介' }).fill(SUMMARY);
                await saveButton(page).click();
                await page.waitForURL(`${BASE}/dramas/${NEW_ID}`);
                await page.getByRole('alert').filter({ hasText: '無法儲存' }).waitFor();
                assertEqual(await idBox(page).inputValue(), NEW_ID, 'ID field');
                assertEqual(
                    await page.getByRole('textbox', { name: '簡介' }).inputValue(),
                    SUMMARY,
                    'draft kept',
                );
                assertEqual(state.puts.length, 0, 'saved PUTs after the failure');
                await shoot(page, 'drama-rename-failed');

                await saveButton(page).click();
                await page.getByRole('alert').waitFor({ state: 'detached' });
                assertEqual(state.renames.length, 1, 'rename requests');
                assertEqual(
                    state.puts.map((put) => [
                        put.id,
                        arcIdsOf(put.body.definition),
                        put.body.definition.summary,
                    ]),
                    [[NEW_ID, RENAMED_ARC_IDS, SUMMARY]],
                    'second save',
                );
                await page.close();
            },
        );

    return [renameSaveCheck, renameOnlyCheck, renameFailedPutCheck];
};
