import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import packageJson from '../../package.json';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { HOME_THEME } from '../config/showThemes';
import { usePlayer } from '../player/usePlayer';
import type { Recording } from '../types/recording';
import { HomePage } from './HomePage';

const BANNER_ALT = '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽';

const RECORDINGS = [
    recording('gongzi', '2026-10-10'),
    recording('gongzi', '2026-10-17'),
    recording('badgirl', '2026-10-19', '1000'),
    recording('wanni', '2026-10-19', '1300'),
];

/** 模擬喺其他頁播緊某集，再返主頁 */
const PlayThenGoHome = ({ target }: { target: Recording }) => {
    const { load } = usePlayer();
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={async () => {
                await load(target, { autoplay: true });
                navigate('/');
            }}
        >
            play then home
        </button>
    );
};

const arriveHomeWith = async (target: Recording, recordings = RECORDINGS) => {
    const view = renderWithProviders(<HomePage />, {
        route: '/elsewhere',
        recordings,
        extraRoutes: [{ path: '/elsewhere', element: <PlayThenGoHome target={target} /> }],
    });
    await userEvent.click(screen.getByRole('button', { name: 'play then home' }));
    await screen.findByRole('navigation');
    return view;
};

describe('HomePage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('lists seven artwork tiles plus today, in order', () => {
        renderWithProviders(<HomePage />);

        const nav = screen.getByRole('navigation');
        expect(
            [...nav.querySelectorAll('button')].map(
                (b) => b.getAttribute('aria-label') ?? b.textContent,
            ),
        ).toEqual([
            'Bad Girl大過佬',
            '公子會',
            '雲妮鍾情',
            '在晴朗的一天出發',
            '西加航空',
            '口水多過浪花',
            '聖艾粒LaLaLaLa',
            '今日節目',
        ]);
    });

    it('should render the banner image as the only page heading when rendered', () => {
        renderWithProviders(<HomePage />);

        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveAccessibleName(BANNER_ALT);
        const banner = screen.getByRole('img', { name: BANNER_ALT });
        expect(headings[0]).toContainElement(banner);
        // 橫額喺節目格之前（頁頂）
        const position = banner.compareDocumentPosition(screen.getByRole('navigation'));
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should offer the wide banner to landscape screens taller than a phone', () => {
        renderWithProviders(<HomePage />);

        const source = screen.getByRole('img', { name: BANNER_ALT }).previousElementSibling;
        expect(source?.tagName).toBe('SOURCE');
        expect(source).toHaveAttribute(
            'media',
            '(orientation: landscape) and (min-width: 640px) and (min-height: 562px)',
        );
        expect(source?.getAttribute('srcset')).toMatch(/banner-wide/);
    });

    it('should put the banner in the tile grid, before the shows, on a phone held sideways', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn((query: string) => ({
                matches: query.includes('max-height: 561px') || query.includes('landscape'),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        );
        renderWithProviders(<HomePage />);

        const nav = screen.getByRole('navigation');
        const banner = screen.getByRole('img', { name: BANNER_ALT });
        expect(nav).toContainElement(banner);
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        const firstShow = screen.getByRole('button', { name: 'Bad Girl大過佬' });
        expect(
            banner.compareDocumentPosition(firstShow) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('should not show the old header text when rendered', () => {
        renderWithProviders(<HomePage />);

        expect(screen.queryByText(/903 player/i)).not.toBeInTheDocument();
        expect(screen.queryByText('收聽節目')).not.toBeInTheDocument();
    });

    it('should apply the home theme vars when rendered', () => {
        renderWithProviders(<HomePage />);

        const scope = screen.getByRole('main').closest('[data-theme-scope]') as HTMLElement;
        expect(scope).not.toBeNull();
        expect(scope.style.getPropertyValue('--theme-bg')).toBe(HOME_THEME.bg);
        expect(scope.style.getPropertyValue('--theme-title')).toBe(HOME_THEME.title);
    });

    it('pauses playback when home is shown without a today recording', () => {
        const { audio } = renderWithProviders(<HomePage />);

        expect(audio.pause).toHaveBeenCalled();
    });

    it('keeps playing when arriving home with a today recording playing', async () => {
        const { audio } = await arriveHomeWith(RECORDINGS[3] as Recording);

        expect(await screen.findByRole('button', { name: '暫停' })).toBeInTheDocument();
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('shows a mini player for today’s first show and plays it on demand', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        const mini = await screen.findByRole('region', { name: '正在播放（今日節目）' });
        expect(mini).toHaveTextContent('Bad Girl大過佬');
        expect(mini).toHaveTextContent('今日 19/10（一）');

        await userEvent.click(screen.getByRole('button', { name: '播放' }));
        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(audio.play).toHaveBeenCalled();
    });

    it('should paint the page canvas with the gradient bottom, even with a floating mini player', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await screen.findByRole('region', { name: '正在播放（今日節目）' });

        expect(document.documentElement.style.getPropertyValue('--page-canvas')).toBe(
            'var(--home-bg-bottom)',
        );
    });

    it('swipes the mini player to the next show of today', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        const mini = await screen.findByRole('region', { name: '正在播放（今日節目）' });

        fireEvent.pointerDown(mini, { clientX: 300, clientY: 10 });
        fireEvent.pointerUp(mini, { clientX: 150, clientY: 10 });

        expect(mini).toHaveTextContent('雲妮鍾情');
    });

    it('opens the show page from the mini player', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        await userEvent.click(
            await screen.findByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' }),
        );

        expect(screen.getByTestId('location')).toHaveTextContent('/show/badgirl');
    });

    it('starts the latest episode and opens the show page', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await waitFor(() =>
            expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'false'),
        );

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));

        expect(audio.src).toBe(RECORDINGS[1]?.url);
        expect(audio.play).toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/show/gongzi');
    });

    it('starts the first show of today and opens the today page', async () => {
        const { audio } = renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await waitFor(() =>
            expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'false'),
        );

        await userEvent.click(screen.getByRole('button', { name: '今日節目' }));

        expect(audio.src).toBe(RECORDINGS[2]?.url);
        expect(screen.getByTestId('location')).toHaveTextContent('/today');
    });

    it('should show the app version on the banner, outside its heading, when rendered', async () => {
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });

        const version = await screen.findByText(`v${packageJson.version}`);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveAccessibleName(BANNER_ALT);
        expect(heading).not.toContainElement(version);
        const position = screen.getByRole('navigation').compareDocumentPosition(version);
        expect(position & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('still navigates when recordings are not loaded yet', async () => {
        const { audio } = renderWithProviders(<HomePage />, {
            prober: () => new Promise(() => {}),
        });

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));

        expect(audio.play).not.toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/show/gongzi');
    });
});
