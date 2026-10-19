import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildFeed, loadFallback, scrapeShows, siteSources } from './scrape';

const OUTPUT_PATH = 'public/data/recordings.json';
const JSON_INDENT = 2;

const main = async (): Promise<void> => {
    const [fallback, fresh] = await Promise.all([
        loadFallback(process.env.FALLBACK_URL),
        scrapeShows(siteSources),
    ]);
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
};

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
