/* S-788：latestEpisodeIds 淨讀最新 ok publish 嘅 episode_ids（PUT warnings / 劇 DELETE 守衛唔使讀 document 全文） */
import { env } from 'cloudflare:test';
import { latestEpisodeIds, latestPublish } from '../src/catalog/store';

const insertPublish = (status: 'ok' | 'failed', episodeIds: readonly string[]) =>
    env.DB.prepare(
        `INSERT INTO publishes (created_at, created_by, hash, document, episode_ids, show_count,
         drama_count, episode_count, status) VALUES ('2026-11-01T00:00:00Z', 'x', 'h', '{}', ?, 0, 0, 0, ?)`,
    )
        .bind(JSON.stringify(episodeIds), status)
        .run();

beforeEach(async () => {
    await env.DB.prepare('DELETE FROM publishes').run();
});

describe('latestEpisodeIds', () => {
    it('should return null when nothing has been published', async () => {
        expect(await latestEpisodeIds(env.DB)).toBeNull();
    });

    it('should return the episode IDs of the newest ok publish', async () => {
        await insertPublish('ok', ['drama:golden:season-1:1']);
        await insertPublish('ok', ['drama:golden:season-1:1', 'drama:golden:season-1:2']);
        expect(await latestEpisodeIds(env.DB)).toEqual([
            'drama:golden:season-1:1',
            'drama:golden:season-1:2',
        ]);
    });

    it('should skip a newer failed publish, like latestPublish', async () => {
        await insertPublish('ok', ['drama:golden:season-1:1']);
        await insertPublish('failed', ['drama:other:season-1:1']);
        const ids = await latestEpisodeIds(env.DB);
        expect(ids).toEqual(['drama:golden:season-1:1']);
        expect(ids).toEqual((await latestPublish(env.DB))?.episodeIds);
    });

    it('should return an empty list for an ok publish without episodes', async () => {
        await insertPublish('ok', []);
        expect(await latestEpisodeIds(env.DB)).toEqual([]);
    });
});
