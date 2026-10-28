// 主頁 mini player 重溫規則 e2e（v1.19.2 起）：聽緊舊集返主頁照播，排第一標「重溫」，後面跟今日節目；
// 今日冇節目（星期日）：冇嘢載入就唔出 mini player，有嘢載入就只出嗰集（region「正在播放（重溫）」）。
// 每個情境用獨立 context，唔受 run.mjs 主流程之前播過乜影響
import { ensurePlaying, isShown, newE2EPage } from './harness.mjs';

// 星期日：假錄音（sampleData.mjs）冇節目喺星期日播，公子會（星期六）17/10 係最近一集
const E2E_SUNDAY = '2026-10-18T22:30:00+08:00';
// 公子會最近一集（今日之前）：入節目頁自動播呢集，返主頁就係重溫
const REWATCH_SHOW = { name: '公子會', route: '#/show/gongzi', dayMonth: '17/10' };
const REWATCH_DOT = `${REWATCH_SHOW.name}，重溫 ${REWATCH_SHOW.dayMonth}（六）`;
const REWATCH_OPEN = `開啟 ${REWATCH_SHOW.name} 節目頁，重溫 ${REWATCH_SHOW.dayMonth}（六）`;
// 19/10（一）今日節目，mini player 次序（同 run.mjs 主頁 mini player 一致）；刻意寫死做獨立對照
const TODAY_SHOWS = ['在晴朗的一天出發', 'Bad Girl大過佬', '雲妮鍾情'];
const REGION_REWATCH_AND_TODAY = '正在播放（重溫及今日節目）';
const REGION_REWATCH_ONLY = '正在播放（重溫）';
const ANY_MINI_REGION = /^正在播放/;
// 主頁 render 完再等咁耐先斷言「冇 mini player」（有嘅話平日呢段時間內早就出咗）
const MINI_ABSENT_SETTLE_MS = 1000;
// 量兩次播放進度之間隔幾耐：照播嘅話進度會行
const PROGRESS_GAP_MS = 2000;

const openHome = async (p, base) => {
    await p.goto(base);
    await p.waitForSelector('nav[aria-busy="false"]');
};

/** 入公子會節目頁（冇其他嘢載入 → 自動播最近一集 17/10），確認播緊嗰集，再撳返回主頁 */
const playOlderEpisodeThenGoHome = async (p, base, log, label) => {
    await p.goto(`${base}${REWATCH_SHOW.route}`);
    await ensurePlaying(p);
    const current = await p
        .locator('button[aria-current="true"]')
        .first()
        .getAttribute('aria-label');
    log(
        current?.startsWith(`暫停 ${REWATCH_SHOW.dayMonth}`),
        `${label}：${REWATCH_SHOW.name}節目頁播緊最近一集（舊集）：${current}`,
    );
    await p.getByRole('button', { name: '返回主頁' }).click();
};

/** 「0:03 / 10:00」嘅已播秒數（aria-valuetext；aria-valuenow 係百分比，2 秒行唔到 1%） */
const playedSeconds = (valueText) => {
    const [, minutes, seconds] = /^(\d+):(\d{2}) \//.exec(valueText ?? '') ?? [];
    return minutes === undefined ? NaN : Number(minutes) * 60 + Number(seconds);
};

/** 返主頁之後照播：mediaSession 係 playing，而且 mini player 嘅已播時間真係行緊 */
const checkKeepsPlaying = async (p, mini) => {
    const progress = mini.getByRole('progressbar', { name: '播放進度' });
    const readProgress = async () => playedSeconds(await progress.getAttribute('aria-valuetext'));
    const before = await readProgress();
    await p.waitForTimeout(PROGRESS_GAP_MS);
    const after = await readProgress();
    const state = await p.evaluate(() => navigator.mediaSession.playbackState);
    return {
        ok: state === 'playing' && after > before,
        detail: `${state}，${before}s → ${after}s`,
    };
};

/** 平日：播緊舊集返主頁照播，第一項係重溫，後面係今日三個節目 */
const checkRewatchWithToday = async ({ browser, base, errors, log }) => {
    const label = '主頁 mini player（平日）';
    const { ctx, p } = await newE2EPage(browser, errors);
    await playOlderEpisodeThenGoHome(p, base, log, label);
    const mini = p.getByRole('region', { name: REGION_REWATCH_AND_TODAY, exact: true });
    const shown = await isShown(mini, { timeout: 5000 });
    log(shown, `${label}：返主頁 mini player 讀屏名係「${REGION_REWATCH_AND_TODAY}」`);
    if (!shown) return ctx.close();
    const playing = await checkKeepsPlaying(p, mini);
    log(playing.ok, `${label}：返主頁舊集繼續播（${playing.detail}）`);
    const dots = await mini
        .getByRole('group')
        .getByRole('button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const expected = [REWATCH_DOT, ...TODAY_SHOWS];
    log(
        dots.join(' | ') === expected.join(' | '),
        `${label}：次序係重溫 + 今日節目（${dots.join(' | ')}）`,
    );
    const open = await mini.getByRole('button', { name: REWATCH_OPEN, exact: true }).count();
    const text = (await mini.textContent()) ?? '';
    log(
        open === 1 && text.startsWith(`${REWATCH_SHOW.name}重溫`),
        `${label}：而家顯示嘅第一項係舊集，標「重溫」（${text}）`,
    );
    await ctx.close();
};

/** 星期日（今日冇節目）：冇嘢載入唔出 mini player；播緊舊集返主頁只出嗰集 */
const checkNoShowDay = async ({ browser, base, errors, log }) => {
    const label = '主頁 mini player（星期日冇節目）';
    const { ctx, p } = await newE2EPage(browser, errors, {}, { now: E2E_SUNDAY });
    await openHome(p, base);
    await p.waitForTimeout(MINI_ABSENT_SETTLE_MS);
    const idle = await p.getByRole('region', { name: ANY_MINI_REGION }).count();
    log(idle === 0, `${label}：冇嘢載入，主頁冇 mini player（${idle} 個）`);
    await playOlderEpisodeThenGoHome(p, base, log, label);
    const mini = p.getByRole('region', { name: REGION_REWATCH_ONLY, exact: true });
    const shown = await isShown(mini, { timeout: 5000 });
    const regions = await p.getByRole('region', { name: ANY_MINI_REGION }).count();
    log(
        shown && regions === 1,
        `${label}：播緊舊集返主頁，只得一個 mini player，讀屏名係「${REGION_REWATCH_ONLY}」`,
    );
    if (!shown) return ctx.close();
    const playing = await checkKeepsPlaying(p, mini);
    log(playing.ok, `${label}：返主頁舊集繼續播（${playing.detail}）`);
    const groups = await mini.getByRole('group').count();
    const open = await mini.getByRole('button', { name: REWATCH_OPEN, exact: true }).count();
    log(
        groups === 0 && open === 1,
        `${label}：淨係顯示載入咗嗰集（重溫），冇頁數指示點（指示點 ${groups} 組）`,
    );
    await ctx.close();
};

/** 主頁 mini player 重溫規則：平日（重溫 + 今日）同星期日（冇節目） */
export const runMiniPlayerRuleChecks = async (env) => {
    await checkRewatchWithToday(env);
    await checkNoShowDay(env);
};
