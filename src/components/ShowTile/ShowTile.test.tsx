import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowTile } from './ShowTile';

describe('ShowTile', () => {
    it('renders a show button and reacts to clicks', async () => {
        const onClick = vi.fn();
        render(<ShowTile label="公子會" onClick={onClick} />);

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('uses the highlighted style for the today variant', () => {
        render(<ShowTile label="今日節目" variant="today" onClick={() => {}} />);

        expect(screen.getByRole('button', { name: '今日節目' }).className).toMatch(/today/);
    });
});
