import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { DAY, MINUTE_MS, NIGHT, renderWithSleepTimer } from '../../../../../tests/sleepTimer';
import { SleepTimerEntry } from './SleepTimerEntry';

const SECOND_MS = 1000;

const moon = () => screen.queryByRole('button', { name: /^睡眠 timer/ });
const sheet = () => screen.queryByRole('dialog', { name: '睡眠 timer' });
const option = (name: string) => within(sheet()!).getByRole('button', { name });

/** 頁面 ThemeScope（頁頂進度條掛喺佢度） */
const inPage = (placement: Parameters<typeof SleepTimerEntry>[0]['placement'] = 'header') => (
    <div data-theme-scope="" data-testid="page">
        <SleepTimerEntry placement={placement} />
    </div>
);

const click = (el: HTMLElement) => fireEvent.click(el);

const startTimer = (name: string) => {
    click(moon()!);
    click(option(name));
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NIGHT);
});

afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
});

describe('SleepTimerEntry', () => {
    it('should render nothing in the daytime with no timer, so existing screens do not change', () => {
        vi.setSystemTime(DAY);
        renderWithSleepTimer(inPage());

        expect(moon()).not.toBeInTheDocument();
        expect(screen.getByTestId('page')).toBeEmptyDOMElement();
    });

    it('should render nothing outside the PlayerProvider', () => {
        render(inPage());

        expect(moon()).not.toBeInTheDocument();
    });

    it('should show an outline moon at night when no timer is running', () => {
        renderWithSleepTimer(inPage());

        const button = moon()!;
        expect(button).toHaveAccessibleName('睡眠 timer');
        expect(button).toHaveAttribute('data-active', 'false');
        expect(button).toHaveAttribute('aria-haspopup', 'dialog');
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(button).not.toHaveTextContent(/\d/);
    });

    it('should open the menu with four options in a 2x2 grid and no remarks', async () => {
        renderWithSleepTimer(inPage());

        click(moon()!);

        const dialog = sheet()!;
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(moon()).toHaveAttribute('aria-expanded', 'true');
        const grid = within(dialog).getByTestId('sleep-timer-options');
        expect(
            within(grid)
                .getAllByRole('button')
                .map((b) => b.textContent),
        ).toEqual(['15 分鐘', '30 分鐘', '60 分鐘', '播完呢集']);
        // 未開：冇「剩餘｜關閉」tab 掣
        expect(within(dialog).queryByRole('group')).not.toBeInTheDocument();
    });

    it('should start the timer, close the menu and count down as mm:ss', async () => {
        renderWithSleepTimer(inPage());

        startTimer('30 分鐘');

        expect(sheet()).not.toBeInTheDocument();
        expect(moon()).toHaveAccessibleName('睡眠 timer，剩餘 30 分 0 秒');
        expect(moon()).toHaveAttribute('data-active', 'true');
        expect(moon()).toHaveTextContent('30:00');

        act(() => vi.advanceTimersByTime(6 * MINUTE_MS + 46 * SECOND_MS));

        expect(moon()).toHaveTextContent('23:14');
        expect(moon()).toHaveAccessibleName('睡眠 timer，剩餘 23 分 14 秒');
    });

    it('should keep showing in the daytime while a timer is running', async () => {
        vi.setSystemTime(new Date(2026, 10, 30, 4, 50).getTime());
        renderWithSleepTimer(inPage());
        startTimer('15 分鐘');

        act(() => vi.advanceTimersByTime(11 * MINUTE_MS));

        expect(moon()).toHaveTextContent('4:00');
    });

    it('should go back to the off state when the time is up', async () => {
        vi.setSystemTime(new Date(2026, 10, 30, 4, 50).getTime());
        renderWithSleepTimer(inPage());
        startTimer('15 分鐘');

        act(() => vi.advanceTimersByTime(15 * MINUTE_MS));

        // 05:05：日間，冇 timer 就完全唔出
        expect(moon()).not.toBeInTheDocument();
    });

    it('should draw a full width page bar that shrinks with the remaining time', async () => {
        renderWithSleepTimer(inPage());
        expect(document.querySelector('[data-sleep-timer-bar]')).not.toBeInTheDocument();

        startTimer('30 分鐘');
        const bar = within(screen.getByTestId('page')).getByTestId('sleep-timer-bar');
        expect(bar).toHaveAttribute('data-sleep-timer-bar', 'page');
        expect(bar).toHaveAttribute('aria-hidden', 'true');
        const fill = bar.firstElementChild as HTMLElement;
        expect(fill.style.transform).toBe('scaleX(1)');

        act(() => vi.advanceTimersByTime(15 * MINUTE_MS));

        expect(fill.style.transform).toBe('scaleX(0.5)');
    });

    it('should draw the bar along the card top edge in the mini player', async () => {
        renderWithSleepTimer(inPage('mini'));

        startTimer('15 分鐘');

        expect(screen.getByTestId('sleep-timer-bar')).toHaveAttribute(
            'data-sleep-timer-bar',
            'card',
        );
    });

    it('should not draw a page bar from the home player card when the page has no theme scope', async () => {
        renderWithSleepTimer(<SleepTimerEntry placement="card" />);

        startTimer('15 分鐘');

        expect(screen.queryByTestId('sleep-timer-bar')).not.toBeInTheDocument();
    });

    it('should draw the home card page bar on the outer page scope', async () => {
        renderWithSleepTimer(
            <div data-theme-scope="" data-testid="home">
                <div data-theme-scope="" data-testid="card">
                    <SleepTimerEntry placement="card" />
                </div>
            </div>,
        );

        startTimer('15 分鐘');

        const bar = screen.getByTestId('sleep-timer-bar');
        expect(bar.parentElement).toBe(screen.getByTestId('home'));
    });

    it('should outline the last option while no timer is running', async () => {
        renderWithSleepTimer(inPage());
        startTimer('60 分鐘');
        act(() => vi.advanceTimersByTime(60 * MINUTE_MS));

        click(moon()!);

        expect(option('60 分鐘')).toHaveAttribute('data-last', 'true');
        expect(option('60 分鐘')).toHaveAttribute('aria-pressed', 'false');
        expect(option('15 分鐘')).toHaveAttribute('data-last', 'false');
    });

    it('should show the running option solid and a remaining｜off tab while running', async () => {
        renderWithSleepTimer(inPage());
        startTimer('30 分鐘');
        act(() => vi.advanceTimersByTime(6 * MINUTE_MS + 46 * SECOND_MS));

        click(moon()!);

        expect(option('30 分鐘')).toHaveAttribute('aria-pressed', 'true');
        expect(option('15 分鐘')).toHaveAttribute('aria-pressed', 'false');
        const tabs = within(sheet()!).getByRole('group', { name: '睡眠 timer 狀態' });
        const [remaining, off] = within(tabs).getAllByRole('button');
        expect(remaining).toHaveTextContent('剩餘 23:14');
        expect(remaining).toHaveAttribute('aria-pressed', 'true');
        expect(off).toHaveTextContent('關閉');
        expect(off).toHaveAttribute('aria-pressed', 'false');
    });

    it('should cancel the timer from the off tab', async () => {
        renderWithSleepTimer(inPage());
        startTimer('30 分鐘');
        click(moon()!);

        click(within(sheet()!).getByRole('button', { name: '關閉' }));

        expect(sheet()).not.toBeInTheDocument();
        expect(moon()).toHaveAttribute('data-active', 'false');
        expect(document.querySelector('[data-sleep-timer-bar]')).not.toBeInTheDocument();
    });

    it('should restart from now when another option is picked while running', async () => {
        renderWithSleepTimer(inPage());
        startTimer('30 分鐘');
        act(() => vi.advanceTimersByTime(10 * MINUTE_MS));
        click(moon()!);

        click(option('15 分鐘'));

        expect(moon()).toHaveTextContent('15:00');
    });

    it('should grey out "end of episode" with nothing loaded (or live)', async () => {
        renderWithSleepTimer(inPage());
        click(moon()!);

        const episode = option('播完呢集');
        expect(episode).toHaveAttribute('aria-disabled', 'true');
        click(episode);

        expect(sheet()).toBeInTheDocument();
        expect(moon()).toHaveAttribute('data-active', 'false');
    });

    it('should show the episode remaining time live and stop at the end of it', async () => {
        const { audio, loadEpisode } = renderWithSleepTimer(inPage());
        await loadEpisode(600, 1);
        click(moon()!);

        expect(option('播完呢集 剩餘時間：9:59')).not.toHaveAttribute('aria-disabled');
        act(() => audio.emitTime(61));
        // 選單開住每秒更新（tickWhileIdle）
        act(() => vi.advanceTimersByTime(SECOND_MS));
        expect(option('播完呢集 剩餘時間：8:59')).toBeInTheDocument();

        click(option('播完呢集 剩餘時間：8:59'));

        expect(moon()).toHaveTextContent('8:59');
    });

    it('should close the menu with Escape and return focus to the moon', async () => {
        renderWithSleepTimer(inPage());
        moon()!.focus();
        click(moon()!);
        expect(sheet()).toContainElement(document.activeElement as HTMLElement);

        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

        expect(sheet()).not.toBeInTheDocument();
        expect(moon()).toHaveFocus();
    });
});
