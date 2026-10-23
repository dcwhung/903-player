import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArcPicker } from './ArcPicker';

const ARCS = [
    { arc: '我哋覺得我哋窮', isNew: false },
    { arc: 'X時mas時小提議', isNew: false },
    { arc: '大妒忌', isNew: true },
];

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
                onOpenAll={() => {}}
            />,
        );

        expect(screen.getByText('現正播放：第 2 集 你洽我')).toBeInTheDocument();
        const group = screen.getByRole('group', { name: '短篇' });
        // 「全集」+ 3 個短篇
        expect(group.querySelectorAll('button')).toHaveLength(4);
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
                onOpenAll={() => {}}
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
                onOpenAll={() => {}}
            />,
        );

        expect(screen.getByRole('button', { name: 'X時mas時小提議' })).toHaveAccessibleDescription(
            '播緊',
        );
        // 大妒忌冇播緊，只有新上架說明
        expect(screen.getByRole('button', { name: '大妒忌' })).toHaveAccessibleDescription(
            '新上架',
        );
    });

    it('scrolls the viewed chip into the middle of its row', () => {
        render(
            <ArcPicker
                arcs={ARCS}
                selected="大妒忌"
                playing="大妒忌"
                label="現正播放"
                onPick={() => {}}
                onOpenAll={() => {}}
            />,
        );

        expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
    });

    it('keeps a 全集 button first, outside the scrolling chips, that opens the overview', async () => {
        const onOpenAll = vi.fn();
        render(
            <ArcPicker
                arcs={ARCS}
                selected="大妒忌"
                playing="大妒忌"
                label="現正播放"
                onPick={() => {}}
                onOpenAll={onOpenAll}
            />,
        );

        const all = screen.getByRole('button', { name: '全集' });
        expect(screen.getByRole('group', { name: '短篇' }).querySelector('button')).toBe(all);
        // 唔喺左右掃嗰行入面：掃 chips 時「全集」釘住唔郁
        expect(all.parentElement?.contains(screen.getByRole('button', { name: /^大妒忌/ }))).toBe(
            true,
        );
        expect(screen.getByRole('button', { name: /^大妒忌/ }).parentElement).not.toBe(
            all.parentElement,
        );
        expect(all).toHaveAttribute('aria-haspopup', 'dialog');
        await userEvent.click(all);
        expect(onOpenAll).toHaveBeenCalled();
    });

    it('marks a newly added 短篇 with 新', () => {
        render(
            <ArcPicker
                arcs={ARCS}
                selected="X時mas時小提議"
                playing="X時mas時小提議"
                label="現正播放"
                onPick={() => {}}
                onOpenAll={() => {}}
            />,
        );

        const fresh = screen.getByRole('button', { name: '大妒忌' });
        expect(fresh).toHaveTextContent('新');
        expect(fresh).toHaveAccessibleDescription('新上架');
        expect(screen.getByRole('button', { name: 'X時mas時小提議' })).not.toHaveTextContent('新');
    });
});
