import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { usePlayer } from '../../player/usePlayer';
import { PlayerPanel } from './PlayerPanel';

const REC = recording('gongzi', '2026-10-17');

const Harness = () => {
    const player = usePlayer();
    return (
        <>
            <button type="button" onClick={() => void player.load(REC)}>
                load
            </button>
            <PlayerPanel
                title="公子會"
                dateLabel="17/10（六）"
                neighbours={{}}
                onStep={() => false}
            />
        </>
    );
};

describe('PlayerPanel', () => {
    it('shows the date, elapsed and total time', async () => {
        const { audio } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));
        act(() => audio.emitTime(2892));

        expect(screen.getByText('17/10（六）')).toBeInTheDocument();
        expect(screen.getByText('48:12')).toBeInTheDocument();
        expect(screen.getByText('1:53:56')).toBeInTheDocument();
        expect(screen.getByRole('slider', { name: '播放進度' })).toHaveAttribute(
            'aria-valuetext',
            '48:12 / 1:53:56',
        );
    });

    it('shows the date strip instead of the show name (節目頁)', () => {
        renderWithProviders(
            <PlayerPanel
                title="公子會"
                dateLabel="17/10（六）"
                neighbours={{ older: '10/10（六）' }}
                onStep={() => true}
            />,
        );

        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
        expect(screen.getByRole('group', { name: '17/10（六） 公子會' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '舊一集 10/10（六）' })).toBeInTheDocument();
    });

    it('shows a placeholder instead of 0:00 while the duration is unknown', async () => {
        renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));

        expect(screen.getByText('--:--')).toBeInTheDocument();
        expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('restarts from the beginning', async () => {
        const { audio } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));
        act(() => audio.emitTime(2892));

        await userEvent.click(screen.getByRole('button', { name: '由頭播放' }));

        expect(audio.currentTime).toBe(0);
        expect(audio.play).toHaveBeenCalled();
    });

    it('toggles and skips through the controls', async () => {
        const { audio } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));

        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(screen.getByRole('button', { name: '暫停' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: '前進 60 秒' }));
        expect(audio.currentTime).toBe(60);
    });

    it('previews the dragged time in the elapsed label', async () => {
        const { audio } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6000));
        const slider = screen.getByRole('slider');
        slider.getBoundingClientRect = () =>
            ({ left: 0, top: 0, width: 300, height: 300 }) as DOMRect;

        fireEvent.pointerDown(slider, { clientX: 150, clientY: 10, pointerId: 1 });

        expect(screen.getByText('50:00')).toBeInTheDocument();
    });
});
