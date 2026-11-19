import { screen } from '@testing-library/react';
import { arcLabelOf } from '@903-player/catalog';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { dramaEpisodeTheme, seriesEpisodesOf } from '../../catalog/dramas';
import type { PlaybackLineState } from '../../utils/playbackState';
import { SeriesSquarePlayer } from './SeriesSquarePlayer';

const EPISODE = seriesEpisodesOf('chisee')[0];
const NOTICE = { text: '全套 12/12 下架', label: '全套 12 月 12 日 下架' };

const renderPlayer = (status: PlaybackLineState, { connecting = false } = {}) => {
    if (!EPISODE) throw new Error('芝See 冇集數');
    return renderWithProviders(
        <SeriesSquarePlayer
            view={{
                theme: dramaEpisodeTheme(EPISODE),
                upNext: EPISODE,
                start: undefined,
                standbyTime: undefined,
                empty: false,
                status,
                notice: NOTICE,
            }}
            connecting={connecting}
        />,
    );
};

/** 唱片下面嗰組字（逐行） */
const lines = () =>
    [...(document.querySelector('[data-series-title]')?.children ?? [])].map(
        (el) => el.textContent ?? '',
    );

describe('SeriesSquarePlayer 快將下架字（S-1147）', () => {
    it.each([
        ['playing', '現正播放'],
        ['paused', '已暫停'],
    ] as const)(
        'should keep the %s status line and put the notice under the arc name',
        (status, label) => {
            renderPlayer(status);

            expect(lines()[0]).toBe(label);
            expect(lines()[1]).toBe(EPISODE ? arcLabelOf(EPISODE) : '');
            expect(lines()[2]).toContain(NOTICE.text);
            expect(screen.getByText(NOTICE.label)).toBeInTheDocument();
        },
    );

    it('should keep 連線中… while connecting', () => {
        renderPlayer('playing', { connecting: true });

        expect(lines()[0]).toBe('連線中…');
        expect(lines()[2]).toContain(NOTICE.text);
    });

    it('should let the notice replace the status line before listening', () => {
        renderPlayer('unloaded');

        expect(lines()[0]).toContain(NOTICE.text);
        expect(lines()).toHaveLength(3);
        expect(lines()[2]).toMatch(/^第 \d+ 集/);
    });
});
