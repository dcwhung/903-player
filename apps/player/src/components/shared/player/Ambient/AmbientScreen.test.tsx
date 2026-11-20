import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { FakeAudio } from '../../../../../tests/fakeAudio';
import { NIGHT, RECORDING } from '../../../../../tests/sleepTimer';
import { stubViewport } from '../../../../../tests/landscape';
import { themeFor } from '../../../../catalog/shows';
import { AMBIENT_IDLE_MS } from '../../../../config/constants';
import { dismissMiniPlayer, restoreMiniPlayer } from '../../../../hooks/miniPlayerDismissed';
import { PlayerProvider } from '../../../../player/PlayerProvider';
import { usePlayer } from '../../../../player/usePlayer';
import { useSleepTimer } from '../../../../player/useSleepTimer';
import { AmbientScreen } from './AmbientScreen';
import { WAKE_CLICK_GRACE_MS } from './useAmbientPresence';

const SQUARE = { width: 544, height: 544 };
const PHONE = { width: 390, height: 844 };
const LABEL = '閒置畫面';
const WAKE = '返回';

type Player = ReturnType<typeof usePlayer>;
type SleepTimer = ReturnType<typeof useSleepTimer>;

const Probe = ({ onReady }: { onReady: (player: Player, timer: SleepTimer) => void }) => {
    onReady(usePlayer(), useSleepTimer());
    return null;
};

/** 真 PlayerProvider + 假 audio；頁面（#page）喺 AmbientScreen 隔籬，等測試睇 inert / 底下嘅掣 */
const renderAmbient = () => {
    const audio = new FakeAudio();
    let player: Player | undefined;
    let timer: SleepTimer | undefined;
    const onPage = vi.fn();
    const utils = render(
        <PlayerProvider audio={audio.asAudio()}>
            <Probe
                onReady={(p, s) => {
                    player = p;
                    timer = s;
                }}
            />
            <button type="button" onClick={onPage}>
                底下嘅掣
            </button>
            <AmbientScreen />
        </PlayerProvider>,
    );
    /** 載入公子會一集（10 分鐘，播到 60 秒），出聲 */
    const load = async ({ duration = 600, time = 60 } = {}) => {
        await act(async () => {
            await player?.load(RECORDING, { autoplay: true });
        });
        act(() => {
            audio.emitMetadata(duration);
            audio.emitTime(time);
            audio.emitAudible();
        });
    };
    const pause = () => act(() => player?.pause());
    const startTimer = () => act(() => void timer?.start(15));
    return { ...utils, audio, load, pause, startTimer, onPage };
};

const idle = (ms = AMBIENT_IDLE_MS) => act(() => vi.advanceTimersByTime(ms));
const ambient = () => screen.queryByRole('dialog', { name: LABEL });

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NIGHT);
    stubViewport(SQUARE, { reducedMotion: true });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    restoreMiniPlayer();
    sessionStorage.clear();
    document.querySelectorAll('[data-test-modal]').forEach((el) => el.remove());
});

describe('AmbientScreen', () => {
    it('should show the ambient dialog after 30 s idle on the square screen with a track loaded', async () => {
        const { load } = renderAmbient();
        await load();

        idle(AMBIENT_IDLE_MS - 1);
        expect(ambient()).toBeNull();
        idle(1);

        const dialog = ambient();
        expect(dialog).not.toBeNull();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        // 掛喺 document.body（portal），唔喺頁面入面
        expect(dialog?.parentElement).toBe(document.body);
        const scoped = within(dialog as HTMLElement);
        expect(scoped.getByText('22:30')).toBeInTheDocument();
        expect(scoped.getByText('11月30日 星期一')).toBeInTheDocument();
        expect(scoped.getByText('公子會')).toBeInTheDocument();
        expect(scoped.getByText('17/10（六）')).toBeInTheDocument();
    });

    it('should never show on a non-square screen', async () => {
        stubViewport(PHONE);
        const { load } = renderAmbient();
        await load();

        idle(AMBIENT_IDLE_MS * 2);

        expect(ambient()).toBeNull();
    });

    it('should not show when nothing is loaded', () => {
        renderAmbient();

        idle(AMBIENT_IDLE_MS * 2);

        expect(ambient()).toBeNull();
    });

    it('should not show when the mini player was swiped away', async () => {
        const { load } = renderAmbient();
        await load();
        act(() => dismissMiniPlayer());

        idle(AMBIENT_IDLE_MS * 2);

        expect(ambient()).toBeNull();
    });

    it('should not show while another modal dialog (sheet / menu) is open', async () => {
        const { load } = renderAmbient();
        await load();
        const sheet = document.createElement('div');
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.dataset.testModal = '';
        document.body.append(sheet);

        idle();

        expect(ambient()).toBeNull();
    });

    it('should restart the 30 s count on any activity', async () => {
        const { load } = renderAmbient();
        await load();

        idle(AMBIENT_IDLE_MS - 1000);
        fireEvent.pointerDown(window);
        idle(AMBIENT_IDLE_MS - 1000);

        expect(ambient()).toBeNull();
        idle(1000);
        expect(ambient()).not.toBeNull();
    });

    it('should make the page underneath inert while shown and focus the overlay itself', async () => {
        const { load, container } = renderAmbient();
        await load();
        idle();

        expect(container).toHaveAttribute('inert');
        // 焦點喺覆蓋層（tabIndex -1），唔喺成個畫面咁大嘅叫醒掣（W-850：唔出全屏焦點框）
        expect(ambient()).toHaveFocus();
        expect(ambient()).toHaveAttribute('tabindex', '-1');
        expect(screen.getByRole('button', { name: WAKE })).not.toHaveFocus();
    });

    it('should give focus back to the element focused before it showed', async () => {
        const { load } = renderAmbient();
        await load();
        const pageButton = screen.getByRole('button', { name: '底下嘅掣' });
        pageButton.focus();
        idle();
        expect(pageButton).not.toHaveFocus();

        fireEvent.keyDown(ambient() as HTMLElement, { key: 'Escape' });

        expect(ambient()).toBeNull();
        expect(pageButton).toHaveFocus();
    });

    it('should dismiss after the grace time when pointerup is not followed by a click', async () => {
        const { load } = renderAmbient();
        await load();
        idle();
        const wake = screen.getByRole('button', { name: WAKE });

        fireEvent.pointerDown(wake);
        fireEvent.pointerUp(wake);
        idle(WAKE_CLICK_GRACE_MS - 1);
        expect(ambient()).not.toBeNull();
        idle(1);

        expect(ambient()).toBeNull();
    });

    it('should dismiss on pointercancel', async () => {
        const { load } = renderAmbient();
        await load();
        idle();
        const wake = screen.getByRole('button', { name: WAKE });

        fireEvent.pointerDown(wake);
        fireEvent.pointerCancel(wake);

        expect(ambient()).toBeNull();
    });

    it('should dismiss on wheel', async () => {
        const { load } = renderAmbient();
        await load();
        idle();

        fireEvent.wheel(ambient() as HTMLElement);

        expect(ambient()).toBeNull();
    });

    it('should dismiss on any other key without passing it to the page', async () => {
        const { load } = renderAmbient();
        await load();
        idle();
        const outside = vi.fn();
        document.addEventListener('keydown', outside);

        const notPrevented = fireEvent.keyDown(ambient() as HTMLElement, { key: 'a' });

        expect(notPrevented).toBe(false);
        expect(outside).not.toHaveBeenCalled();
        expect(ambient()).toBeNull();
        document.removeEventListener('keydown', outside);
    });

    it('should swallow the first tap: only wake, never reach the page underneath', async () => {
        const { load, container, onPage, audio } = renderAmbient();
        await load();
        idle();
        const outside = vi.fn();
        document.addEventListener('pointerdown', outside);
        const wake = screen.getByRole('button', { name: WAKE });
        // 真瀏覽器：useIdle 喺 window capture 收到 pointerdown，佢嘅 update 喺覆蓋層收到之前已經 render 咗；
        // 閒置 reset 唔可以拆走覆蓋層（要等叫醒）
        fireEvent.pointerDown(window);
        expect(ambient()).not.toBeNull();

        const notPrevented = fireEvent.pointerDown(wake);
        // pointerdown 之後到 click 之前：覆蓋層仲喺度接住 pointerup / click
        expect(ambient()).not.toBeNull();
        fireEvent.pointerUp(wake);
        fireEvent.click(wake);

        expect(notPrevented).toBe(false);
        expect(outside).not.toHaveBeenCalled();
        expect(onPage).not.toHaveBeenCalled();
        expect(audio.paused).toBe(false);
        expect(ambient()).toBeNull();
        expect(container).not.toHaveAttribute('inert');
        document.removeEventListener('pointerdown', outside);
    });

    it('should wake on Escape and come back after another 30 s idle', async () => {
        const { load } = renderAmbient();
        await load();
        idle();

        fireEvent.keyDown(ambient() as HTMLElement, { key: 'Escape' });
        expect(ambient()).toBeNull();

        idle(AMBIENT_IDLE_MS - 1);
        expect(ambient()).toBeNull();
        idle(1);
        expect(ambient()).not.toBeNull();
    });

    it('should keep the overlay mounted while fading out when motion is allowed', async () => {
        stubViewport(SQUARE);
        const { load } = renderAmbient();
        await load();
        idle();

        const wake = screen.getByRole('button', { name: WAKE });
        fireEvent.pointerDown(wake);
        fireEvent.click(wake);

        // 淡出緊：唔再接 tap，頁面已經唔 inert
        expect(ambient()).toHaveAttribute('data-state', 'leaving');
        // 唔等 animationend：jsdom 冇 token 時長 → 即刻拆
        idle(0);
        expect(ambient()).toBeNull();
    });

    it('should spin the disc and draw the progress ring from 12 o’clock while playing', async () => {
        const { load } = renderAmbient();
        await load({ duration: 600, time: 150 });
        idle();

        const dialog = ambient() as HTMLElement;
        expect(dialog.querySelector('[data-ambient-status="playing"]')).not.toBeNull();
        const ring = dialog.querySelector('[data-testid="ambient-ring"]');
        expect(ring).not.toBeNull();
        expect(ring?.querySelector('[data-ring-fill]')?.getAttribute('transform')).toMatch(
            /^rotate\(-90/,
        );
        expect(dialog.querySelector('[class*="spinning"]')).not.toBeNull();
    });

    it('should show 已暫停 with a stopped, dimmed disc when paused', async () => {
        const { load, pause } = renderAmbient();
        await load();
        pause();
        idle();

        const dialog = ambient() as HTMLElement;
        expect(within(dialog).getByText('已暫停 · 17/10（六）')).toBeInTheDocument();
        expect(dialog.querySelector('[data-ambient-status="paused"]')).not.toBeNull();
        expect(dialog.querySelector('[class*="spinning"]')).toBeNull();
    });

    it('should keep the disc upright with no ring and 直播 for a live stream', async () => {
        const { load } = renderAmbient();
        await load({ duration: Number.POSITIVE_INFINITY });
        idle();

        const dialog = ambient() as HTMLElement;
        expect(within(dialog).getByText('直播')).toBeInTheDocument();
        expect(dialog.querySelector('[data-testid="ambient-ring"]')).toBeNull();
        expect(dialog.querySelector('[class*="upright"]')).not.toBeNull();
    });

    it('should show the sleep timer bar and remaining time (display only) when a timer is on', async () => {
        const { load, startTimer } = renderAmbient();
        await load();
        startTimer();
        idle();

        const dialog = ambient() as HTMLElement;
        expect(within(dialog).getByTestId('sleep-timer-bar')).toHaveAttribute(
            'data-sleep-timer-bar',
            'page',
        );
        // 15 分鐘 timer，閒置咗 30 秒
        expect(within(dialog).getByText('14:30')).toBeInTheDocument();
        expect(within(dialog).getAllByRole('button')).toHaveLength(1);
    });

    it('should paint the overlay in the playing item theme', async () => {
        const { load } = renderAmbient();
        await load();
        idle();

        const scope = (ambient() as HTMLElement).querySelector<HTMLElement>('[data-theme-scope]');
        expect(scope?.style.getPropertyValue('--theme-bg')).toBe(themeFor('gongzi').bg);
    });

    it('should hold a screen wake lock while something is loaded on the square screen', async () => {
        const release = vi.fn(() => Promise.resolve());
        const request = vi.fn(() => Promise.resolve({ released: false, release }));
        vi.stubGlobal(
            'navigator',
            Object.assign(Object.create(navigator), { wakeLock: { request } }),
        );
        const { load } = renderAmbient();
        expect(request).not.toHaveBeenCalled();

        await load();

        expect(request).toHaveBeenCalledWith('screen');
    });
});
