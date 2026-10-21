import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { PlayerCard } from './PlayerCard';

describe('PlayerCard', () => {
    it('shows the disc, the progress ring, play beside restart and the show name', () => {
        renderWithProviders(<PlayerCard title="公子會" />);

        expect(screen.getByRole('heading', { level: 2, name: '公子會' })).toBeInTheDocument();
        expect(screen.getByRole('slider', { name: '播放進度' })).toBeInTheDocument();
        expect(screen.getAllByText('--:--')).toHaveLength(2);
        expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
            '由頭播放',
            '播放',
        ]);
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });
});
