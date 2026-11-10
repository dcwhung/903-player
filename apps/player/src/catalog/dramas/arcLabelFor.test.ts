import { buildRegistry } from '@903-player/catalog';
import { arcLabelFor } from './index';

const THEME = {
    bg: '#000000',
    surface: '#000000',
    track: '#000000',
    accent: '#000000',
    onAccent: '#000000',
    title: '#000000',
    text: '#000000',
    muted: '#000000',
    shadowDark: '#000000',
    shadowLight: '#000000',
};

const registry = buildRegistry(
    {
        folders: () => [
            {
                id: 'p3',
                source: 'p3/drama.json',
                definition: {
                    name: '劇',
                    kind: 'series',
                    enabled: true,
                    tile: 'tile.webp',
                    disc: 'disc.webp',
                    audio: { host: 'r2', folder: 'p3', file: '{no}.m4a' },
                    theme: THEME,
                    arcs: [
                        { id: 'a', name: 'R2 名', displayName: '顯示名', episodes: 1 },
                        { id: 'b', name: '普通', episodes: 1 },
                    ],
                },
                images: { 'tile.webp': '/t.webp', 'disc.webp': '/d.webp' },
            },
        ],
    },
    { appAudioBase: '/dramas/' },
);

vi.mock('../runtime', () => ({ activeDramaRegistry: () => registry }));

describe('arcLabelFor', () => {
    it('should give the displayName of a bookmarked arc, else the arc name', () => {
        expect(arcLabelFor('p3', 'R2 名')).toBe('顯示名');
        expect(arcLabelFor('p3', '普通')).toBe('普通');
        expect(arcLabelFor('p3', '冇咗')).toBe('冇咗');
        expect(arcLabelFor('nope', 'x')).toBe('x');
    });
});
