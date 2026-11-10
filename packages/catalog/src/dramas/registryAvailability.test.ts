/* registry 按今日（hkToday）篩集數：未上架 / 已下架嘅唔出（P8 #6） */
import type { EpisodeBuildOptions } from './episodes';
import { buildRegistry } from './registry';
import type { DramaFolder } from './source';

const THEME = {
    bg: '#f3efde',
    surface: '#faf7ec',
    track: '#e0d6b8',
    accent: '#d45f32',
    onAccent: '#ffffff',
    title: '#a8401a',
    text: '#33281d',
    muted: '#6b5a47',
    shadowDark: '#e0d6b8',
    shadowLight: '#ffffff',
};

const folder = (id: string, patch: Record<string, unknown>): DramaFolder => ({
    id,
    source: `src/catalog/dramas/library/${id}/drama.json`,
    definition: {
        name: id,
        kind: 'series',
        enabled: true,
        tile: 'tile.webp',
        disc: 'disc.webp',
        audio: { host: 'r2', folder: id, file: '{arc}/{no}.m4a' },
        theme: THEME,
        arcs: [{ id: 'a', name: 'A', episodes: 2 }],
        ...patch,
    },
    images: { 'tile.webp': '/tile.webp', 'disc.webp': '/disc.webp' },
});

const TODAY = '2026-11-05';

/** 呢度淨係睇上架 / 下架，錄音 base 唔重要 */
const OPTIONS = { appAudioBase: '/dramas/' };

const registry = buildRegistry(
    {
        folders: () => [
            folder('live', {
                arcs: [
                    {
                        id: 'half',
                        name: '戀愛二分一',
                        episodes: 4,
                        episodeDates: { '3': '2026-11-19' },
                    },
                    { id: 'xxx', name: 'XXX', addedAt: '2026-11-12' },
                    { id: 'old', name: '舊', episodes: 2, removedAt: '2026-11-01' },
                    {
                        id: 'partial',
                        name: '部分',
                        episodes: 3,
                        episodeRemovedAt: { '1': '2026-11-02' },
                        removedAt: '2026-12-05',
                    },
                ],
            }),
            folder('soon', { addedAt: '2026-12-01' }),
            folder('gone', { removedAt: '2026-11-01' }),
        ],
    },
    OPTIONS,
);

describe('registry availability', () => {
    it('should give only released, not removed episodes for today', () => {
        const shown = registry.seriesEpisodesOf('live', TODAY).map((e) => `${e.arc}${e.no}`);
        expect(shown).toEqual(['戀愛二分一1', '戀愛二分一2', '部分2', '部分3']);
        expect(registry.seriesEpisodesOf('live', '2026-11-19')).toHaveLength(6);
    });

    it('should keep upcoming and removed dramas off the shelf, with their status', () => {
        expect(registry.enabledDramas(TODAY).map((d) => d.id)).toEqual(['live']);
        expect(registry.upcomingDramas(TODAY).map((d) => d.id)).toEqual(['soon']);
        expect(registry.dramaStatus('soon', TODAY)).toBe('upcoming');
        expect(registry.dramaStatus('gone', TODAY)).toBe('removed');
        expect(registry.dramaStatus('live', TODAY)).toBe('live');
        expect(registry.dramaStatus('nope', TODAY)).toBe('missing');
        expect(registry.dramaEpisodesOf('soon', TODAY)).toEqual([]);
        expect(registry.dramaEpisodesOf('gone', TODAY)).toEqual([]);
    });

    it('should still find removed episodes in the catalog for the saved tab', () => {
        const [removed] = registry.seriesEpisodesOf('gone', '2026-10-01');
        expect(removed && registry.catalogEpisodeOf('gone', removed.id)).toEqual(removed);
    });

    it('should describe each arc for the coming-soon UI', () => {
        const arcs = registry.arcAvailabilityOf('live');
        expect(arcs.map((a) => a.arc)).toEqual(['戀愛二分一', 'XXX', '舊', '部分']);
        expect(arcs[0]?.batches).toEqual([{ first: 3, last: 4, date: '2026-11-19' }]);
        expect(arcs[1]).toMatchObject({ addedAt: '2026-11-12' });
        expect(arcs[1]?.count).toBeUndefined();
        expect(arcs[3]?.removals).toEqual([{ first: 1, last: 1, date: '2026-11-02' }]);
        expect(registry.findDrama('soon')).toMatchObject({ launchedAt: '2026-12-01' });
        expect(registry.findDrama('gone')).toMatchObject({ removedAt: '2026-11-01' });
    });
});

describe('registry: Phase 3 arc enabled / displayName', () => {
    const phase3 = (options: EpisodeBuildOptions = OPTIONS) =>
        buildRegistry(
            {
                folders: () => [
                    folder('p3', {
                        arcs: [
                            { id: 'shown', name: 'R2 名', displayName: '顯示名', episodes: 2 },
                            { id: 'hidden', name: '下架', episodes: 2, enabled: false },
                            { id: 'plain', name: '普通', episodes: 1, enabled: true },
                        ],
                    }),
                ],
            },
            options,
        );

    it('should skip disabled arcs in episodes and arc availability', () => {
        const registry = phase3();
        expect(registry.catalogEpisodesOf('p3').map((e) => e.id)).toEqual([
            'drama:p3:shown:1',
            'drama:p3:shown:2',
            'drama:p3:plain:1',
        ]);
        expect(registry.arcAvailabilityOf('p3').map((a) => a.arc)).toEqual(['R2 名', '普通']);
    });

    it('should carry arcLabel only for arcs with a displayName, keeping arc = name for keys', () => {
        const registry = phase3();
        const [first] = registry.seriesEpisodesOf('p3', TODAY);
        expect(first).toMatchObject({ arc: 'R2 名', arcLabel: '顯示名' });
        expect(first?.url).toContain(encodeURIComponent('R2 名'));
        const [shown, plain] = registry.arcAvailabilityOf('p3');
        expect(shown).toMatchObject({ arc: 'R2 名', arcLabel: '顯示名' });
        expect(plain && 'arcLabel' in plain).toBe(false);
    });

    it('should keep disabled arcs when includeDisabledArcs is set (ID guard)', () => {
        const ids = phase3({ ...OPTIONS, includeDisabledArcs: true })
            .catalogEpisodesOf('p3')
            .map((e) => e.id);
        expect(ids).toContain('drama:p3:hidden:1');
    });
});
