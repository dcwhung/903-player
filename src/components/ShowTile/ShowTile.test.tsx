import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowTile } from './ShowTile';

describe('ShowTile', () => {
    it('shows the artwork without visible text but keeps an accessible name', async () => {
        const onClick = vi.fn();
        render(<ShowTile label="公子會" art="/art/gongzi.jpg" onClick={onClick} />);

        const button = screen.getByRole('button', { name: '公子會' });
        expect(button).not.toHaveTextContent('公子會');
        expect(button.querySelector('img')).toHaveAttribute('src', '/art/gongzi.jpg');
        await userEvent.click(button);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows a New badge and says so in its name when today has a new episode', () => {
        render(<ShowTile label="公子會" art="/art/gongzi.jpg" isNew onClick={() => {}} />);

        const button = screen.getByRole('button', { name: '公子會，今日有新一集' });
        expect(button).toHaveTextContent('New');
    });

    it('shows no badge by default', () => {
        render(<ShowTile label="公子會" art="/art/gongzi.jpg" onClick={() => {}} />);

        expect(screen.getByRole('button', { name: '公子會' })).not.toHaveTextContent('New');
    });

    it('shows the label on the today tile', () => {
        render(<ShowTile label="今日節目" variant="today" onClick={() => {}} />);

        const button = screen.getByRole('button', { name: '今日節目' });
        expect(button).toHaveTextContent('今日節目');
        expect(button.className).toMatch(/today/);
    });

    it('should draw the today illustration as a decorative background', () => {
        render(<ShowTile label="今日節目" variant="today" onClick={() => {}} />);

        const art = screen.getByRole('button', { name: '今日節目' }).querySelector('img');
        expect(art).toHaveAttribute('alt', '');
        expect(art?.getAttribute('src')).toMatch(/today-tile/);
    });
});
