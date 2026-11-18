import { render, screen } from '@testing-library/react';
import { useState } from 'react';
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

/** 外面播咗揀嗰日：current 跟住變（同節目頁一樣） */
const Harness = ({ onPick }: { onPick: (url: string) => void }) => {
    const [current, setCurrent] = useState(1);
    const label = DAYS[current]?.date ?? '';
    return (
        <DateColumn
            days={DAYS}
            current={current}
            onPick={(url) => {
                onPick(url);
                setCurrent(DAYS.findIndex((day) => day.url === url));
            }}
            connecting={false}
            dateLabel={label}
        />
    );
};

const renderColumn = (onPick = vi.fn()) => {
    render(<Harness onPick={onPick} />);
    return onPick;
};

describe('DateColumn', () => {
    it('should list only the days with an episode, newest first', () => {
        renderColumn();

        const cells = screen.getAllByRole('listitem').map((li) => li.textContent);
        expect(cells).toEqual(['一30/11', '六28/11', '五27/11']);
    });

    it('should mark the playing day and name the list by its label', () => {
        renderColumn();

        expect(screen.getByRole('list', { name: '現正播放' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /30\/11/ })).toHaveAttribute(
            'aria-current',
            'date',
        );
        expect(screen.getByRole('button', { name: /30\/11/ })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    // W-792：撳完焦點留喺同一粒掣（變咗現正播放），轉集讀出嚟
    it('should keep focus on the tapped day and announce the switch', async () => {
        renderColumn();

        const day = screen.getByRole('button', { name: /28\/11/ });
        await userEvent.click(day);

        expect(day).toHaveFocus();
        expect(day).toHaveAttribute('aria-current', 'date');
        expect(screen.getByRole('status')).toHaveTextContent('2026-11-28');
    });

    it('should not play again when the playing day is tapped', async () => {
        const onPick = renderColumn();

        await userEvent.click(screen.getByRole('button', { name: /30\/11/ }));

        expect(onPick).not.toHaveBeenCalled();
    });

    it('should play another day when tapped', async () => {
        const onPick = renderColumn();

        await userEvent.click(screen.getByRole('button', { name: /28\/11/ }));

        expect(onPick).toHaveBeenCalledWith('b.m4a');
    });

    it('should say connecting while the duration is unknown', () => {
        render(
            <DateColumn days={DAYS} current={1} onPick={vi.fn()} connecting dateLabel="30/11" />,
        );

        expect(screen.getByText('連線中…')).toBeInTheDocument();
    });
});
