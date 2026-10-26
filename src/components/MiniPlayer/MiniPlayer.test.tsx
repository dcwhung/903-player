import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { themeFor } from '../../shows';
import { MiniPlayer, type MiniPlayerProps } from './MiniPlayer';

const props = (overrides: Partial<MiniPlayerProps> = {}): MiniPlayerProps => ({
    showName: 'Bad Girl大過佬',
    region: '正在播放（今日節目）',
    openLabel: '開啟 Bad Girl大過佬 節目頁',
    theme: themeFor('badgirl'),
    subtitle: '今日 19/10（一）· 12:40 / 1:58:30',
    timeText: '12:40 / 1:58:30',
    isPlaying: true,
    progress: 0.11,
    labels: ['雲妮鍾情', '在晴朗的一天出發', 'Bad Girl大過佬'],
    keys: ['/wanni.aac', '/sunnyday.aac', '/badgirl.aac'],
    index: 2,
    onToggle: vi.fn(),
    onOpen: vi.fn(),
    onChange: vi.fn(),
    ...overrides,
});

describe('MiniPlayer', () => {
    it('should keep the dots and their touch area above the row when there are several audios', () => {
        render(<MiniPlayer {...props()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region).toHaveAttribute('data-mode', 'multi');
        expect(region.querySelector('.dots')).not.toBeNull();
    });

    it('should drop the dots wrapper for a single audio (e.g. a drama episode)', () => {
        render(<MiniPlayer {...props({ labels: ['黃金少年'], keys: ['/ep1.aac'], index: 0 })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region).toHaveAttribute('data-mode', 'single');
        expect(region.querySelector('.dots')).toBeNull();
    });

    it('names its region after what plays', () => {
        render(<MiniPlayer {...props({ region: '正在播放（廣播劇）' })} />);
        expect(screen.getByRole('region', { name: '正在播放（廣播劇）' })).toBeInTheDocument();
    });

    it('names the open button after where it leads', () => {
        render(<MiniPlayer {...props({ openLabel: '開啟 黃金少年 廣播劇頁' })} />);
        expect(screen.getByRole('button', { name: '開啟 黃金少年 廣播劇頁' })).toBeInTheDocument();
    });

    it('shows the current today show in its own theme', () => {
        render(<MiniPlayer {...props()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region).toHaveTextContent('Bad Girl大過佬');
        expect(region).toHaveTextContent('今日 19/10（一）· 12:40 / 1:58:30');
        expect(region.closest('[data-theme-scope]')).toHaveStyle({ '--theme-accent': '#f08a24' });
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '11');
    });

    it('renders straight into the body, outside any page container that could clip it', () => {
        const { container } = render(<MiniPlayer {...props()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(container).not.toContainElement(region);
        expect(region.closest('[data-theme-scope]')?.parentElement).toBe(document.body);
    });

    it('names the progress bar and reads out the time', () => {
        render(<MiniPlayer {...props()} />);

        const bar = screen.getByRole('progressbar', { name: '播放進度' });
        expect(bar).toHaveAttribute('aria-valuetext', '12:40 / 1:58:30');
    });

    it('leaves out the value text while the duration is unknown', () => {
        render(<MiniPlayer {...props({ timeText: undefined })} />);

        expect(screen.getByRole('progressbar', { name: '播放進度' })).not.toHaveAttribute(
            'aria-valuetext',
        );
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

    it('wraps to the last today show when swiping right at the first show', () => {
        const p = props({ index: 0 });
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 200, clientY: 12 });

        expect(p.onChange).toHaveBeenCalledWith(2);
    });

    it('wraps to the first today show when swiping left at the last show', () => {
        const p = props({ index: 2 });
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 200, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 100, clientY: 12 });

        expect(p.onChange).toHaveBeenCalledWith(0);
    });

    it('does nothing when swiping with a single today show', () => {
        const p = props({ labels: ['Bad Girl大過佬'], keys: ['/badgirl.aac'], index: 0 });
        render(<MiniPlayer {...p} />);
        const region = screen.getByRole('region');

        fireEvent.pointerDown(region, { clientX: 200, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 100, clientY: 12 });
        fireEvent.pointerDown(region, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(region, { clientX: 200, clientY: 12 });

        expect(p.onChange).not.toHaveBeenCalled();
    });

    it('does not open the show page when a swipe ends on the open button', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

        fireEvent.pointerDown(open, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { clientX: 220, clientY: 10 });
        fireEvent.click(open, { detail: 1 }); // 滑鼠 click

        expect(p.onChange).toHaveBeenCalledWith(1);
        expect(p.onOpen).not.toHaveBeenCalled();
    });

    it('lets a keyboard click through after a touch swipe that sent no click', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });
        const toggle = screen.getByRole('button', { name: '暫停' });

        fireEvent.pointerDown(open, { pointerType: 'touch', clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { pointerType: 'touch', clientX: 220, clientY: 10 });
        fireEvent.click(toggle, { detail: 0 });
        fireEvent.click(open, { detail: 0 });

        expect(p.onChange).toHaveBeenCalledWith(1);
        expect(p.onToggle).toHaveBeenCalledTimes(1);
        expect(p.onOpen).toHaveBeenCalledTimes(1);
    });

    it('still opens the show page on a plain tap', () => {
        const p = props();
        render(<MiniPlayer {...p} />);
        const open = screen.getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

        fireEvent.pointerDown(open, { clientX: 100, clientY: 10 });
        fireEvent.pointerUp(open, { clientX: 102, clientY: 10 });
        fireEvent.click(open, { detail: 1 }); // 滑鼠 click

        expect(p.onOpen).toHaveBeenCalledTimes(1);
    });

    it('shows a play button while paused', () => {
        render(<MiniPlayer {...props({ isPlaying: false })} />);

        expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument();
    });
});
