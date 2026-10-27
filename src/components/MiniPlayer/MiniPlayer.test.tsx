import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { themeFor } from '../../shows';
import { MiniPlayer, type MiniPlayerProps } from './MiniPlayer';

const props = (overrides: Partial<MiniPlayerProps> = {}): MiniPlayerProps => ({
    showName: 'Bad Girl大過佬',
    region: '正在播放（今日節目）',
    openLabel: '開啟 Bad Girl大過佬 節目頁',
    theme: themeFor('badgirl'),
    subtitle: '19/10（一） · 12:40 / 1:58:30',
    timeText: '12:40 / 1:58:30',
    isPlaying: true,
    isAudible: true,
    upright: false,
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

    it('should spin the disc while it is audible', () => {
        render(<MiniPlayer {...props({ isPlaying: true, isAudible: true })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region.querySelector('.face')?.className).toMatch(/spinning/);
    });

    it('should stop the disc in place when paused', () => {
        render(<MiniPlayer {...props({ isPlaying: false, isAudible: false })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region.querySelector('.face')?.className).not.toMatch(/spinning/);
    });

    // CUI-0005：同大碟一樣，撳咗播但載緊 / 斷流（未出聲）唔轉
    it('should keep the disc still while loading or stalled, though play was pressed', () => {
        render(<MiniPlayer {...props({ isPlaying: true, isAudible: false })} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        expect(region.querySelector('.face')?.className).not.toMatch(/spinning/);
        expect(screen.getByRole('button', { name: '暫停' })).toBeInTheDocument();
    });

    it('should stand the disc upright while the duration is unknown', () => {
        const { rerender } = render(<MiniPlayer {...props({ upright: true })} />);
        const face = () => screen.getByRole('region').querySelector('.face');
        expect(face()?.className).toMatch(/upright/);

        rerender(<MiniPlayer {...props({ upright: false })} />);
        expect(face()?.className).not.toMatch(/upright/);
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
        expect(region).toHaveTextContent('19/10（一） · 12:40 / 1:58:30');
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

    describe('tags', () => {
        const REWATCH = props({
            labels: ['Bad Girl大過佬，重溫 12/10（一）', '雲妮鍾情', 'Bad Girl大過佬'],
            tags: ['rewatch', 'today', 'today'],
            index: 0,
        });

        it('should tag the current show 重溫 next to its name, in the faded-accent first dot', () => {
            render(<MiniPlayer {...REWATCH} />);

            const region = screen.getByRole('region');
            const tag = region.querySelector('[data-tag]');
            expect(tag).toHaveAttribute('data-tag', 'rewatch');
            expect(tag).toHaveTextContent('重溫');
            expect(tag).toHaveAttribute('aria-hidden', 'true');
            expect(
                screen.getByRole('button', { name: 'Bad Girl大過佬，重溫 12/10（一）' }),
            ).toHaveAttribute('data-variant', 'accent');
            expect(screen.getByRole('button', { name: '雲妮鍾情' })).toHaveAttribute(
                'data-variant',
                'gold',
            );
        });

        it('should leave untagged dots plain (latest-day fallback)', () => {
            render(<MiniPlayer {...props({ tags: [undefined, undefined, undefined] })} />);

            expect(screen.getByRole('region').querySelectorAll('[data-variant]')).toHaveLength(0);
        });

        it('should tag a today show 今日', () => {
            render(<MiniPlayer {...REWATCH} index={1} />);

            expect(screen.getByRole('region').querySelector('[data-tag]')).toHaveAttribute(
                'data-tag',
                'today',
            );
            expect(screen.getByRole('region')).toHaveTextContent('今日');
        });

        it('should show no tag without tags (latest-day fallback, drama)', () => {
            render(<MiniPlayer {...props()} />);

            expect(screen.getByRole('region').querySelector('[data-tag]')).toBeNull();
        });

        it('should name the dots group with the given position label', () => {
            render(
                <MiniPlayer
                    {...REWATCH}
                    positionLabel={(index, total) => `第 ${index} 個，共 ${total} 個`}
                />,
            );

            expect(screen.getByRole('group', { name: '第 1 個，共 3 個' })).toBeInTheDocument();
        });
    });
});
