import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { usePlayer } from '../../player/usePlayer';
import { stripDays } from '../DateStrip/dateStrip';
import { PlayerPanel } from './PlayerPanel';

const REC = recording('gongzi', '2026-10-17');
const OLDER = recording('gongzi', '2026-10-10');
const STRIP = stripDays([REC, OLDER], REC.url);

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
                days={STRIP.days}
                currentDay={STRIP.current}
                onPick={() => undefined}
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
                days={STRIP.days}
                currentDay={STRIP.current}
                onPick={() => undefined}
            />,
        );

        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
        expect(screen.getByRole('group', { name: '17/10（六） 公子會' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '轉去 10/10（六）' })).toBeInTheDocument();
    });

    it('shows a placeholder instead of 0:00 while the duration is unknown', async () => {
        renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));

        // 已播時間都未可信（例如斷網讀唔到 metadata）：兩邊都顯示佔位
        expect(screen.getAllByText('--:--')).toHaveLength(2);
        expect(screen.queryByText('0:00')).not.toBeInTheDocument();
        expect(screen.getByRole('slider', { name: '播放進度' })).toHaveAttribute(
            'aria-valuetext',
            '--:-- / --:--',
        );
    });

    it('labels the date strip as connecting until the duration is known', async () => {
        const { audio } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        expect(screen.getByText('連線中…')).toBeInTheDocument();
        expect(screen.queryByText('現正播放')).not.toBeInTheDocument();

        act(() => audio.emitMetadata(6836));
        expect(screen.getByText('現正播放')).toBeInTheDocument();
        expect(screen.queryByText('連線中…')).not.toBeInTheDocument();
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

    it('toggles through the play button beside restart, with no skip buttons', async () => {
        const { audio } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));

        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(screen.getByRole('button', { name: '暫停' })).toBeInTheDocument();

        expect(screen.queryByRole('button', { name: /秒$/ })).not.toBeInTheDocument();
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

    it('does not spin the disc until the audio actually starts playing', async () => {
        const { audio, container } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));
        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        const face = container.querySelector('[class*="face"]');
        expect(face?.className).not.toMatch(/spinning/);

        act(() => audio.emitPlaying());
        expect(face?.className).toMatch(/spinning/);

        act(() => audio.emitWaiting());
        expect(face?.className).not.toMatch(/spinning/);
    });

    it('stops the disc spin while the date strip holds it', async () => {
        const { audio, container } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));
        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        act(() => audio.emitPlaying());
        const face = container.querySelector('[class*="face"]');
        const strip = screen.getByRole('group', { name: '17/10（六） 公子會' });
        expect(face?.className).toMatch(/spinning/);

        fireEvent.pointerDown(strip, { clientX: 200, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(strip, { clientX: 150, clientY: 10, pointerId: 1 });
        expect(face?.className).not.toMatch(/spinning/);

        fireEvent.pointerUp(strip, { clientX: 195, clientY: 10, pointerId: 1 });
        expect(face?.className).toMatch(/spinning/);
    });

    it('ignores a second finger on the date strip while the first one drags', async () => {
        const { audio, container } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));
        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        act(() => audio.emitPlaying());
        const face = container.querySelector('[class*="face"]');
        const strip = screen.getByRole('group', { name: '17/10（六） 公子會' });

        fireEvent.pointerDown(strip, { clientX: 200, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(strip, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerDown(strip, { clientX: 100, clientY: 10, pointerId: 2 });
        fireEvent.pointerUp(strip, { clientX: 100, clientY: 10, pointerId: 2 });
        expect(face?.className).not.toMatch(/spinning/);

        fireEvent.pointerUp(strip, { clientX: 195, clientY: 10, pointerId: 1 });
        expect(face?.className).toMatch(/spinning/);
    });

    it('lets the disc spin again when a date strip drag is cancelled', async () => {
        const { audio, container } = renderWithProviders(<Harness />);
        await userEvent.click(screen.getByRole('button', { name: 'load' }));
        act(() => audio.emitMetadata(6836));
        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        act(() => audio.emitPlaying());
        const face = container.querySelector('[class*="face"]');
        const strip = screen.getByRole('group', { name: '17/10（六） 公子會' });

        fireEvent.pointerDown(strip, { clientX: 200, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(strip, { clientX: 150, clientY: 10, pointerId: 1 });
        fireEvent.pointerCancel(strip, { pointerId: 1 });

        expect(face?.className).toMatch(/spinning/);
    });
});
