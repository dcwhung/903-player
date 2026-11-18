import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StripDay } from '../DateStrip/dateStrip';
import { DateColumn } from './DateColumn';

// 由新到舊：盡頭留空格、有集數、冇節目（週末）
const DAYS: StripDay[] = [
    { date: '2026-12-01', url: null, inRange: false },
    { date: '2026-11-30', url: 'a.m4a', inRange: true },
    { date: '2026-11-29', url: null, inRange: true },
    { date: '2026-11-28', url: 'b.m4a', inRange: true },
    { date: '2026-11-27', url: 'c.m4a', inRange: true },
];

const renderColumn = (onPick = vi.fn()) => {
    render(<DateColumn days={DAYS} current={1} onPick={onPick} connecting={false} />);
    return onPick;
};

describe('DateColumn', () => {
    it('should list only the days with an episode, newest first', () => {
        renderColumn();

        const cells = screen.getAllByRole('listitem').map((li) => li.textContent);
        expect(cells).toEqual(['一30/11', '六28/11', '五27/11']);
    });

    it('should mark the playing day and label the column', () => {
        renderColumn();

        expect(screen.getByText('現正播放')).toBeInTheDocument();
        expect(screen.getByText('30/11').closest('[aria-current="date"]')).not.toBeNull();
    });

    it('should play another day when tapped', async () => {
        const onPick = renderColumn();

        await userEvent.click(screen.getByRole('button', { name: /28\/11/ }));

        expect(onPick).toHaveBeenCalledWith('b.m4a');
    });

    it('should say connecting while the duration is unknown', () => {
        render(<DateColumn days={DAYS} current={1} onPick={vi.fn()} connecting />);

        expect(screen.getByText('連線中…')).toBeInTheDocument();
    });
});
