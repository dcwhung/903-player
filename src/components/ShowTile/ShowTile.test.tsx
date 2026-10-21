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

    it('shows the label on the today tile', () => {
        render(<ShowTile label="今日節目" variant="today" onClick={() => {}} />);

        const button = screen.getByRole('button', { name: '今日節目' });
        expect(button).toHaveTextContent('今日節目');
        expect(button.className).toMatch(/today/);
    });

    it('should render a decorative sound wave as aria-hidden when variant is today', () => {
        render(<ShowTile label="今日節目" variant="today" onClick={() => {}} />);

        const wave = screen.getByRole('button', { name: '今日節目' }).querySelector('.wave');
        expect(wave).toHaveAttribute('aria-hidden', 'true');
        expect(wave?.querySelectorAll('line')).toHaveLength(5);
    });

    it('should not render the sound wave when variant is show', () => {
        render(<ShowTile label="公子會" art="/art/gongzi.jpg" onClick={() => {}} />);

        expect(screen.getByRole('button', { name: '公子會' }).querySelector('.wave')).toBeNull();
    });
});
