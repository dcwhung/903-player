import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { PlayerCard } from './PlayerCard';

describe('PlayerCard', () => {
    it('shows only the disc, the progress ring and the show name', () => {
        renderWithProviders(<PlayerCard title="公子會" />);

        expect(screen.getByRole('heading', { level: 2, name: '公子會' })).toBeInTheDocument();
        expect(screen.getByRole('slider', { name: '播放進度' })).toBeInTheDocument();
        expect(screen.getByText('--:--')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '播放' })).not.toBeInTheDocument();
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });
});
