// Admin e2e section：App 圖示重新裁切（admin 0.9.0 / api 0.13.0，icon recrop）
// 卡上 iPhone / Android 預覽係掣：由原圖 + 上次嘅框開「調整 App 圖示」，只改撳咗嗰個裝置
// 由 run.mjs 傳入共用 helper（check / newPage / shoot / loggedIn / BASE），回返 check function 清單
import { fileURLToPath } from 'node:url';

const ICON_FIXTURE = fileURLToPath(new URL('./fixtures/lancy-disc.webp', import.meta.url));

const assertPressed = async (button, what) => {
    if ((await button.getAttribute('aria-pressed')) !== 'true')
        throw new Error(`${what} should be the chosen device`);
};

export const iconRecropChecks = ({ check, newPage, shoot, loggedIn, BASE }) => {
    /** 更換時連原圖 + 框一齊存；撳 iPhone 預覽 → 只郁 iPhone 嘅框，Android / 分頁照舊，原圖唔再上載 */
    const iconRecropCheck = (browser) =>
        check(
            'App 圖示: click a device preview to re-crop it from the stored original',
            async () => {
                const state = loggedIn();
                const page = await newPage(browser, state);
                await page.goto(`${BASE}/appearance`);
                const chooser = page.waitForEvent('filechooser');
                await page.getByRole('button', { name: '更換 App 圖示', exact: true }).click();
                await (await chooser).setFiles(ICON_FIXTURE);
                const replace = page.getByRole('dialog', { name: '更換 App 圖示' });
                await replace.getByRole('button', { name: '上載' }).click();
                await replace.waitFor({ state: 'detached' });
                const saved = state.branding.icon?.source;
                if (saved?.image !== 'src1.webp' || state.sources.length !== 1)
                    throw new Error(`original not stored: ${JSON.stringify(saved)}`);

                // 撳 iPhone 預覽（鍵盤）→ 調整 dialog：iPhone 單獨調
                const ios = page.getByRole('button', { name: '調整 iPhone 主畫面圖示' });
                await ios.focus();
                await page.keyboard.press('Enter');
                const dialog = page.getByRole('dialog', { name: '調整 App 圖示' });
                await assertPressed(dialog.getByRole('button', { name: 'iPhone' }), 'iPhone');
                if (
                    await dialog.getByRole('checkbox', { name: '所有裝置使用同一裁切' }).isChecked()
                )
                    throw new Error('adjusting one device should turn the shared crop off');
                await shoot(page, 'appearance-icon-recrop');
                const box = dialog.getByRole('group', { name: /^裁切框/ });
                await box.focus();
                await page.keyboard.press('-');
                await page.keyboard.press('ArrowRight');
                await dialog.getByRole('button', { name: '上載' }).click();
                await dialog.waitFor({ state: 'detached' });

                const after = state.branding.icon?.source;
                if (state.sources.length !== 1) throw new Error('original uploaded again');
                if (JSON.stringify(after?.boxes.android) !== JSON.stringify(saved.boxes.android))
                    throw new Error('Android crop changed while adjusting iPhone');
                if (JSON.stringify(after?.boxes.ios) === JSON.stringify(saved.boxes.ios))
                    throw new Error('iPhone crop not saved');
                if (after?.same !== false) throw new Error('shared crop should be off');

                // 內建預設（還原後）：撳 Android 方形 → 由 repo 原圖開 Android
                await page.getByRole('button', { name: '還原 App 圖示' }).click();
                const restore = page.getByRole('dialog', { name: '還原 App 圖示？' });
                await restore.getByRole('button', { name: '還原' }).click();
                await page.getByText('內建預設').first().waitFor();
                await page.getByRole('button', { name: '調整 Android 方形圖示' }).click();
                const builtIn = page.getByRole('dialog', { name: '調整 App 圖示' });
                await builtIn.getByText('app-icon.png').waitFor();
                await assertPressed(builtIn.getByRole('button', { name: 'Android' }), 'Android');
                await builtIn.getByRole('button', { name: '取消' }).click();
                await builtIn.waitFor({ state: 'detached' });
                await page.close();
            },
        );

    return [iconRecropCheck];
};
