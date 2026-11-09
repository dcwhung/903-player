// @vitest-environment node
// buildCatalogJson.mjs 用 node:fs 讀 library/，要真 file: 路徑（jsdom 環境嘅 import.meta.url 唔係 file:）
/*
 * 「用戶零影響」嘅自動證明（Backend Phase 1 plan D）：scripts/buildCatalogJson.mjs 由 library/ 生成嘅 catalog.json，
 * 經 parseCatalogDocument + documentSource build 出嚟嘅 registry，同 app 內建 registry（bundledSource）逐樣比：
 * 劇集 / 節目資料、每集 episode ID + 音檔 URL、上架 / 下架日子、status、theme、圖。
 * 圖 URL 兩邊本來就唔同（內建係 Vite hash 路徑，catalog 係 imageBase 下面），所以統一換做「kind/id/檔名」再比
 */
import {
    buildRegistry,
    buildShowRegistry,
    documentSource,
    parseCatalogDocument,
    type CatalogDocument,
    type DramaRegistry,
    type FolderSource,
    type ShowRegistry,
} from '@903-player/catalog';
import { buildCatalogDocument } from '../../scripts/buildCatalogJson.mjs';
import { bundledSource as bundledDramas } from './dramas/lib/bundledSource';
import { PLAYER_EPISODE_OPTIONS } from './dramas/lib/episodeOptions';
import { bundledSource as bundledShows } from './shows/lib/bundledSource';

const CATALOG_DIR = new URL('./', import.meta.url).pathname;
const IMAGE_BASE = 'https://catalog.example.com/v1/';
const GENERATED_AT = '2026-11-07T10:00:00Z';
/** status / 上架列表逐個星期比：由最早 addedAt 之前到最遲 removedAt 之後 */
const FIRST_DAY = Date.UTC(2026, 8, 1);
const LAST_DAY = Date.UTC(2027, 5, 1);
const WEEK_MS = 7 * 86_400_000;

const days = (): string[] => {
    const result: string[] = [];
    for (let t = FIRST_DAY; t <= LAST_DAY; t += WEEK_MS)
        result.push(new Date(t).toISOString().slice(0, 10));
    return result;
};

/** 圖 URL → 「kind/id/檔名」：兩邊各自由自己嘅 FolderSource 砌 */
const imageKeys = (kind: string, source: FolderSource): [string, string][] =>
    source
        .folders()
        .flatMap(({ id, images }) =>
            Object.entries(images).map(([file, url]): [string, string] => [
                url,
                `${kind}/${id}/${file}`,
            ]),
        );

/** JSON round-trip，順手將所有圖 URL 換做 key */
const normalizer = (keys: ReadonlyMap<string, string>) => (value: unknown) =>
    JSON.parse(
        JSON.stringify(value, (_k, v: unknown) => (typeof v === 'string' ? (keys.get(v) ?? v) : v)),
    ) as unknown;

/** 一個 drama registry 嘅所有可觀察輸出 */
const dramaSnapshot = (registry: DramaRegistry) =>
    registry.dramas.map((drama) => {
        const episodes = registry.catalogEpisodesOf(drama.id);
        const arcs = [...new Set(episodes.flatMap((e) => (e.kind === 'series' ? [e.arc] : [])))];
        return {
            drama,
            episodes,
            arcAvailability: registry.arcAvailabilityOf(drama.id),
            art: episodes.map((e) => [
                e.id,
                registry.dramaArtFor(e),
                registry.dramaEpisodeTheme(e),
            ]),
            arcTiles: arcs.map((arc) => [arc, registry.arcTileFor(drama.id, arc)]),
            theme: registry.dramaThemeFor(drama.id),
            byDay: days().map((day) => [
                day,
                registry.dramaStatus(drama.id, day),
                registry.dramaEpisodesOf(drama.id, day).map((e) => e.id),
            ]),
        };
    });

const showSnapshot = (registry: ShowRegistry) =>
    registry.shows.map((show) => ({ show, theme: registry.themeFor(show.id) }));

const listsByDay = (registry: DramaRegistry) =>
    days().map((day) => [
        registry.enabledDramas(day).map((d) => d.id),
        registry.upcomingDramas(day).map((d) => d.id),
    ]);

describe('catalog.json generated from library/', () => {
    const doc: CatalogDocument = parseCatalogDocument(
        buildCatalogDocument({
            catalogDir: CATALOG_DIR,
            imageBase: IMAGE_BASE,
            generatedAt: GENERATED_AT,
        }),
    );
    const remoteDramas = documentSource(doc, 'dramas');
    const remoteShows = documentSource(doc, 'shows');
    const keys = new Map([
        ...imageKeys('dramas', bundledDramas),
        ...imageKeys('dramas', remoteDramas),
        ...imageKeys('shows', bundledShows),
        ...imageKeys('shows', remoteShows),
    ]);
    const normalize = normalizer(keys);
    const bundled = {
        dramas: buildRegistry(bundledDramas, PLAYER_EPISODE_OPTIONS),
        shows: buildShowRegistry(bundledShows),
    };
    const remote = {
        dramas: buildRegistry(remoteDramas, PLAYER_EPISODE_OPTIONS),
        shows: buildShowRegistry(remoteShows),
    };

    it('should list every library folder with the same images', () => {
        const ids = (source: FolderSource) =>
            source
                .folders()
                .map((f) => f.id)
                .sort();
        expect(ids(remoteDramas)).toEqual(ids(bundledDramas));
        expect(ids(remoteShows)).toEqual(ids(bundledShows));
        expect([...keys.values()].length).toBe(new Set(keys.values()).size * 2);
    });

    it('should point every image at the image base', () => {
        const urls = [...remoteDramas.folders(), ...remoteShows.folders()].flatMap((f) =>
            Object.values(f.images),
        );
        expect(urls.length).toBeGreaterThan(0);
        urls.forEach((url) => expect(url.startsWith(IMAGE_BASE)).toBe(true));
    });

    it('should build the same dramas, episodes (ID + URL), dates, status, theme and art', () => {
        expect(normalize(dramaSnapshot(remote.dramas))).toEqual(
            normalize(dramaSnapshot(bundled.dramas)),
        );
    });

    it('should list the same live and upcoming dramas on every day', () => {
        expect(listsByDay(remote.dramas)).toEqual(listsByDay(bundled.dramas));
    });

    it('should build the same shows and themes', () => {
        expect(normalize(showSnapshot(remote.shows))).toEqual(
            normalize(showSnapshot(bundled.shows)),
        );
    });

    it('should keep generatedAt and the schema version', () => {
        expect(doc.generatedAt).toBe(GENERATED_AT);
        expect(doc.schemaVersion).toBe(1);
    });
});
