import { recording } from '../../tests/renderWithProviders';
import { adjacentEpisodeUrl } from './adjacentEpisode';

// 最新喺頂：index 0 係最新一集
const EPISODES = [
    recording('gongzi', '2026-10-17'),
    recording('gongzi', '2026-10-10'),
    recording('gongzi', '2026-10-03'),
];
const urlAt = (i: number) => EPISODES[i]?.url;

describe('adjacentEpisodeUrl', () => {
    it('steps to the next older episode (one row down) for next', () => {
        expect(adjacentEpisodeUrl(EPISODES, urlAt(0), 'next')).toBe(urlAt(1));
        expect(adjacentEpisodeUrl(EPISODES, urlAt(1), 'next')).toBe(urlAt(2));
    });

    it('steps to the next newer episode (one row up) for previous', () => {
        expect(adjacentEpisodeUrl(EPISODES, urlAt(2), 'previous')).toBe(urlAt(1));
        expect(adjacentEpisodeUrl(EPISODES, urlAt(1), 'previous')).toBe(urlAt(0));
    });

    it('does nothing past either end', () => {
        expect(adjacentEpisodeUrl(EPISODES, urlAt(0), 'previous')).toBeNull();
        expect(adjacentEpisodeUrl(EPISODES, urlAt(2), 'next')).toBeNull();
    });

    it('does nothing when the current episode is not in the list', () => {
        expect(adjacentEpisodeUrl(EPISODES, 'https://example.com/x.aac', 'next')).toBeNull();
        expect(adjacentEpisodeUrl(EPISODES, undefined, 'next')).toBeNull();
        expect(adjacentEpisodeUrl([], undefined, 'previous')).toBeNull();
    });
});
