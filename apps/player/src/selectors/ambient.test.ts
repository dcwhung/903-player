import type { DramaEpisode } from '@903-player/catalog';
import { recording } from '../../tests/renderWithProviders';
import {
    dailyEpisodesOf,
    dramaArtFor,
    dramaEpisodeTheme,
    seriesEpisodesOf,
} from '../catalog/dramas';
import { themeFor } from '../catalog/shows';
import { ambientView, canShowAmbient, type AmbientInput } from './ambient';
import { dramaEpisodeLabel } from './dramas';
import { trackView } from './pageHandle';

const GONGZI = recording('gongzi', '2026-10-17');
const CHISEE = seriesEpisodesOf('chisee')[0] as DramaEpisode;
const C18 = dailyEpisodesOf('c18')[0] as DramaEpisode;

const DURATION = 3600;

const input = (overrides: Partial<AmbientInput>): AmbientInput => ({
    track: GONGZI,
    isPlaying: true,
    currentTime: 900,
    duration: DURATION,
    ...overrides,
});

describe('ambientView', () => {
    it('should be null when nothing is loaded', () => {
        expect(ambientView(input({ track: null }))).toBeNull();
    });

    it('should show a show recording with its theme, disc and date label', () => {
        expect(ambientView(input({}))).toEqual({
            name: '公子會',
            theme: themeFor('gongzi'),
            art: themeFor('gongzi').art,
            subtitle: '17/10（六）',
            status: 'playing',
            progress: 0.25,
            live: false,
        });
    });

    it('should show a series drama episode with its arc label and episode disc', () => {
        const view = ambientView(input({ track: CHISEE }));
        expect(view).toMatchObject({
            theme: dramaEpisodeTheme(CHISEE),
            art: dramaArtFor(CHISEE),
            subtitle: dramaEpisodeLabel(CHISEE),
            live: false,
        });
        expect(view?.name).not.toBe('');
    });

    it('should show a daily drama episode with its date label', () => {
        expect(ambientView(input({ track: C18 }))).toMatchObject({
            theme: dramaEpisodeTheme(C18),
            art: dramaArtFor(C18),
            subtitle: dramaEpisodeLabel(C18),
        });
    });

    it('should report paused when not playing', () => {
        expect(ambientView(input({ isPlaying: false }))?.status).toBe('paused');
    });

    it('should cap progress at the end', () => {
        expect(ambientView(input({ currentTime: DURATION + 5 }))?.progress).toBe(1);
    });

    it('should treat a live stream (Infinity duration) as live: no ring, 直播 subtitle', () => {
        expect(ambientView(input({ duration: Number.POSITIVE_INFINITY }))).toMatchObject({
            progress: null,
            live: true,
            subtitle: '直播',
        });
    });

    it.each([
        ['0', 0],
        ['NaN', Number.NaN],
    ])(
        'should not treat an unknown (%s) duration as live: no ring, normal subtitle',
        (_n, duration) => {
            expect(ambientView(input({ duration }))).toMatchObject({
                progress: null,
                live: false,
                subtitle: '17/10（六）',
            });
            expect(ambientView(input({ track: CHISEE, duration }))).toMatchObject({
                progress: null,
                live: false,
                subtitle: dramaEpisodeLabel(CHISEE),
            });
        },
    );

    it.each([
        ['show', GONGZI],
        ['drama', CHISEE],
    ])(
        'should share the name, theme and status with the inner page handle (%s)',
        (_kind, track) => {
            expect(ambientView(input({ track, isPlaying: false }))).toMatchObject(
                trackView(track, false),
            );
        },
    );
});

describe('canShowAmbient', () => {
    const ok = { hasTrack: true, miniPlayerDismissed: false, modalOpen: false };

    it('should allow ambient with a loaded track, a mini player and no open modal', () => {
        expect(canShowAmbient(ok)).toBe(true);
    });

    it.each([
        ['nothing is loaded', { hasTrack: false }],
        ['the mini player was dismissed', { miniPlayerDismissed: true }],
        ['a modal dialog is open', { modalOpen: true }],
    ])('should not allow ambient when %s', (_name, overrides) => {
        expect(canShowAmbient({ ...ok, ...overrides })).toBe(false);
    });
});
