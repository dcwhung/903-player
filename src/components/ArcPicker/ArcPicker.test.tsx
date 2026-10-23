import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArcPicker } from './ArcPicker';

const ARCS = ['我哋覺得我哋窮', 'X時mas時小提議', '大妒忌'];

describe('ArcPicker', () => {
    beforeEach(() => {
        HTMLElement.prototype.scrollTo = vi.fn();
    });

    it('shows what is playing above a chip per arc, with the viewed arc pressed', () => {
        render(
            <ArcPicker
                arcs={ARCS}
                selected="X時mas時小提議"
                playing="X時mas時小提議"
                label="現正播放：第 2 集 你洽我"
                onPick={() => {}}
            />,
        );

        expect(screen.getByText('現正播放：第 2 集 你洽我')).toBeInTheDocument();
        const group = screen.getByRole('group', { name: '主題' });
        expect(group.querySelectorAll('button')).toHaveLength(3);
        expect(screen.getByRole('button', { name: 'X時mas時小提議' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: '大妒忌' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    it('reports the arc that was tapped', async () => {
        const onPick = vi.fn();
        render(
            <ArcPicker
                arcs={ARCS}
                selected="X時mas時小提議"
                playing="X時mas時小提議"
                label="現正播放"
                onPick={onPick}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: '大妒忌' }));

        expect(onPick).toHaveBeenCalledWith('大妒忌');
    });

    it('marks the playing arc while another arc is being viewed', () => {
        render(
            <ArcPicker
                arcs={ARCS}
                selected="大妒忌"
                playing="X時mas時小提議"
                label="現正播放"
                onPick={() => {}}
            />,
        );

        expect(screen.getByRole('button', { name: 'X時mas時小提議' })).toHaveAccessibleDescription(
            '播緊',
        );
        expect(screen.getByRole('button', { name: '大妒忌' })).not.toHaveAccessibleDescription();
    });

    it('scrolls the viewed chip into the middle of its row', () => {
        render(
            <ArcPicker
                arcs={ARCS}
                selected="大妒忌"
                playing="大妒忌"
                label="現正播放"
                onPick={() => {}}
            />,
        );

        expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
    });
});
