// 產生 preview 用嘅假錄音列表（真實 URL 格式）
import { mkdirSync, writeFileSync } from 'node:fs';
import { E2E_NOW } from './harness.mjs';
const [outFile] = process.argv.slice(2);
const shows = [
    ['badgirl', 'Bad Girl大過佬', '1000', [1, 2, 3, 4, 5]],
    ['gongzi', '公子會', '2308', [6]],
    ['wanni', '雲妮鍾情', '1300', [1, 2, 3, 4, 5]],
    ['sunnyday', '在晴朗的一天出發', '0600', [1, 2, 3, 4, 5]],
    ['westair', '西加航空', '2000', [1, 2, 3, 4, 5]],
];
const recordings = [];
for (
    let d = new Date('2026-09-21T00:00:00Z');
    d <= new Date('2026-10-19T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1)
) {
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
mkdirSync(outFile.replace(/\/[^/]+$/, ''), { recursive: true });
writeFileSync(
    outFile,
    // 同瀏覽器固定時鐘一致，每次產生嘅檔案都一樣
    JSON.stringify({ generatedAt: new Date(E2E_NOW).toISOString(), recordings }, null, 2),
);
console.log(`${recordings.length} recordings`);
