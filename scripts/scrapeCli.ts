import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Recording, RecordingsFeed } from '../src/types/recording';
import { buildFeed, fetchShowFromSite, scrapeShows } from './scrape';

const OUTPUT_PATH = 'public/data/recordings.json';
const JSON_INDENT = 2;

/** 上次 deploy 嘅 JSON（GitHub Pages），爬唔到時做後備 */
const loadFallback = async (url: string | undefined): Promise<Recording[]> => {
    if (!url) {
        return [];
    }
    try {
        const response = await fetch(url);
        const feed = (await response.json()) as RecordingsFeed;
        return Array.isArray(feed.recordings) ? feed.recordings : [];
    } catch {
        console.warn('[scrape] fallback unavailable');
        return [];
    }
};

const main = async (): Promise<void> => {
    const [fallback, fresh] = await Promise.all([
        loadFallback(process.env.FALLBACK_URL),
        scrapeShows(fetchShowFromSite),
    ]);
    const feed = buildFeed(fresh, fallback);
    fresh.forEach((recordings, showId) =>
        console.log(`[scrape] ${showId}: ${recordings ? recordings.length : 'fallback'}`),
    );
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
