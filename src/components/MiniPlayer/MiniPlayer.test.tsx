import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SHOW_THEMES } from '../../config/showThemes';
import { MiniPlayer, type MiniPlayerProps } from './MiniPlayer';

const props = (overrides: Partial<MiniPlayerProps> = {}): MiniPlayerProps => ({
    showName: 'Bad Girl大過佬',
    theme: SHOW_THEMES.badgirl,
    subtitle: '今日 19/10（一）· 12:40 / 1:58:30',
    isPlaying: true,
    progress: 0.11,
    labels: ['雲妮鍾情', '在晴朗的一天出發', 'Bad Girl大過佬'],
    index: 2,
    onToggle: vi.fn(),
    onOpen: vi.fn(),
    onChange: vi.fn(),
    ...overrides,
});

describe('MiniPlayer', () => {
    it('shows the current today show in its own theme', () => {
        render(<MiniPlayer {...props()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region).toHaveTextContent('Bad Girl大過佬');
        expect(region).toHaveTextContent('今日 19/10（一）· 12:40 / 1:58:30');
        expect(region.closest('[data-theme-scope]')).toHaveStyle({ '--theme-accent': '#f08a24' });
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '11');
    });

    it('opens the show page and toggles playback', async () => {
        const p = props();
        render(<MiniPlayer {...p} />);

        await userEvent.click(screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }));
        await userEvent.click(screen.getByRole('button', { name: '暫停' }));

        expect(p.onOpen).toHaveBeenCalledTimes(1);
        expect(p.onToggle).toHaveBeenCalledTimes(1);
    });

    it('switches to the previous today show on a right swipe', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 200, clientY: 12 });

        expect(p.onChange).toHaveBeenCalledWith(1);
    });

    it('does not open the show page when a swipe ends on the open button', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

        fireEvent.pointerDown(open, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { clientX: 220, clientY: 10 });
        fireEvent.click(open);

        expect(p.onChange).toHaveBeenCalledWith(1);
        expect(p.onOpen).not.toHaveBeenCalled();
    });

    it('still opens the show page on a plain tap', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

        fireEvent.pointerDown(open, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { clientX: 102, clientY: 10 });
        fireEvent.click(open);

        expect(p.onOpen).toHaveBeenCalledTimes(1);
    });

    it('shows a play button while paused', () => {
        render(<MiniPlayer {...props({ isPlaying: false })} />);

        expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    });
});
