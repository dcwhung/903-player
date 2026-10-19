import { render, screen } from '@testing-library/react';
import { PlayerTitles } from './PlayerTitles';

describe('PlayerTitles', () => {
    it('shows the date, the show name heading and the accessory', () => {
        render(
            <PlayerTitles
                title="公子會"
                dateLabel="17/10（六）"
                accessory={<button type="button">指示點</button>}
            />,
        );

        expect(screen.getByText('17/10（六）')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '公子會' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '指示點' })).toBeInTheDocument();
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });
});
