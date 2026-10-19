import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hkToday } from '../src/utils/date';
import {
    annotate,
    buildFeed,
    createSiteSources,
    loadFallback,
    scrapeShows,
    summariseFeed,
} from './scrape';

const OUTPUT_PATH = 'public/data/recordings.json';
const JSON_INDENT = 2;

const main = async (): Promise<void> => {
    // 先攞上次 feed：爬到已有嘅錄音就唔使再跟落一頁，減少對原站嘅請求
    const fallback = await loadFallback(process.env.FALLBACK_URL);
    const sources = createSiteSources({ knownUrls: fallback.map((r) => r.url) });
    const fresh = await scrapeShows(sources);
    const feed = buildFeed(fresh, fallback);
    fresh.forEach((result, showId) => {
        const source = result
            ? `${result.recordings.length}${result.complete ? '' : ' + fallback'}`
            : 'fallback';
        console.log(`[scrape] ${showId}: ${source}`);
    });
    if (feed.recordings.length === 0) {
        // 寧願 deploy 失敗、保留舊版本，都唔好發佈一個空列表
        throw new Error('No recordings scraped and no fallback available');
    }
    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, JSON.stringify(feed, null, JSON_INDENT));
    console.log(`[scrape] wrote ${feed.recordings.length} recordings to ${OUTPUT_PATH}`);
    // 寫完先出摘要 annotation（可以經 GitHub API 讀到），確認係真正發佈嘅內容
    annotate('notice', `Feed: ${summariseFeed(feed, hkToday())}`);
};

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
