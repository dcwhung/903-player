// e2e 用嘅假錄音（真實 URL 格式）：harness.mjs 開 context 時寫入 probe store 嘅 localStorage，
// 當係用戶之前已經 probe 到嘅錄音（app 唯一嘅資料來源）
const shows = [
    ['badgirl', 'Bad Girl大過佬', '1000', [1, 2, 3, 4, 5]],
    ['gongzi', '公子會', '2308', [6]],
    ['wanni', '雲妮鍾情', '1300', [1, 2, 3, 4, 5]],
    ['sunnyday', '在晴朗的一天出發', '0600', [1, 2, 3, 4, 5]],
    ['westair', '西加航空', '2000', [1, 2, 3, 4, 5]],
];
const FIRST_DAY = '2026-09-21T00:00:00Z';
const LAST_DAY = '2026-10-19T00:00:00Z';

const buildSampleRecordings = () => {
    const recordings = [];
    for (let d = new Date(FIRST_DAY); d <= new Date(LAST_DAY); d.setUTCDate(d.getUTCDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        for (const [id, name, time, days] of shows) {
            if (!days.includes(d.getUTCDay())) continue;
            if (id === 'westair' && iso === '2026-10-19') continue; // 晚間節目今日未播
            const file = `${iso.replaceAll('-', '')}_${time}_${name}.aac`;
            recordings.push({
                showId: id,
                date: iso,
                time,
                url: `https://audio.hkfm903.live/${encodeURIComponent(name)}/${encodeURIComponent(file)}`,
            });
        }
    }
    return recordings;
};

/** 固定日期範圍，每次產生嘅列表都一樣 */
export const SAMPLE_RECORDINGS = buildSampleRecordings();
