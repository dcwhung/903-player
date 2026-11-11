import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TimeRoller, type TimeRange } from './TimeRoller';

function Harness({ initial }: { initial: TimeRange }) {
    const [value, setValue] = useState(initial);
    return <TimeRoller value={value} onChange={setValue} />;
}

describe('TimeRoller', () => {
    it('should open an hour / minute roller for the start box', async () => {
        render(<Harness initial={{ start: '15:00', end: '16:30' }} />);
        await userEvent.click(screen.getByRole('button', { name: '開始時間 15:00' }));
        expect(screen.getByRole('dialog', { name: '開始時間' })).toBeInTheDocument();
        expect(screen.getByRole('listbox', { name: '時' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '15', selected: true })).toBeInTheDocument();
    });

    it('should step minutes by 15 and keep the duration when the start moves', async () => {
        render(<Harness initial={{ start: '15:00', end: '16:30' }} />);
        await userEvent.click(screen.getByRole('button', { name: '開始時間 15:00' }));
        fireEvent.keyDown(screen.getByRole('listbox', { name: '分' }), { key: 'ArrowDown' });
        expect(screen.getByRole('button', { name: '開始時間 15:15' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '完結時間 16:45' })).toBeInTheDocument();
    });

    it('should only offer end hours within 3 hours of the start', async () => {
        render(<Harness initial={{ start: '15:00', end: '16:30' }} />);
        await userEvent.click(screen.getByRole('button', { name: '完結時間 16:30' }));
        const hours = screen.getByRole('listbox', { name: '時' });
        fireEvent.keyDown(hours, { key: 'ArrowDown' });
        fireEvent.keyDown(hours, { key: 'ArrowDown' });
        fireEvent.keyDown(hours, { key: 'ArrowDown' });
        expect(screen.getByRole('button', { name: '完結時間 18:00' })).toBeInTheDocument();
    });

    it('should close on Escape', async () => {
        render(<Harness initial={{ start: '15:00', end: '16:30' }} />);
        await userEvent.click(screen.getByRole('button', { name: '開始時間 15:00' }));
        fireEvent.keyDown(screen.getByRole('listbox', { name: '時' }), { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '開始時間 15:00' })).toHaveFocus();
    });
});
