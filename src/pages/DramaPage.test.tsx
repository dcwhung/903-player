import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { stubLandscape } from '../../tests/landscape';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { dramaArtFor, findDrama, seriesEpisodesOf } from '../dramas';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { usePlayer } from '../player/usePlayer';
import { saveProgress } from '../services/progressStore';
import { DramaPage } from './DramaPage';

const PATH = '/drama/:dramaId';
const CHISEE = seriesEpisodesOf('chisee');
const XMAS = CHISEE.filter((e) => e.arc === 'Ｘ時mas時小提議');

const openDrama = (id: string) =>
    renderWithProviders(<DramaPage />, { route: `/drama/${id}`, path: PATH });
/** 短篇劇集頁入頁唔自動播：入頁再撳播放 */
const pressPlay = () => userEvent.click(screen.getByRole('button', { name: '播放' }));
const openDramaAndPlay = async (id: string) => {
    const rendered = openDrama(id);
    await pressPlay();
    return rendered;
};

/** 同一個 player 入面主頁 mini player 會用嘅碟面 */
const MiniArtProbe = () => <span data-testid="mini-art" data-art={useMiniPlayer()?.theme.art} />;
/** 之前聽過芝See（第一集聽咗少少）：唔係第一次入，唔開全集表 */
const listenedBefore = () => saveProgress(CHISEE[0]?.url ?? '', 60, 1200);
/** 入劇集頁之前，播緊另一樣嘢（例如今日節目） */
const OTHER_REC = recording('gongzi', '2026-10-17');
const OtherPlayer = () => {
    const player = usePlayer();
    return (
        <button type="button" onClick={() => void player.load(OTHER_REC, { autoplay: true })}>
            play other
        </button>
    );
};
const openDramaWhileOtherPlays = async (id: string) => {
    const rendered = renderWithProviders(
        <>
            <OtherPlayer />
            <DramaPage />
        </>,
        { route: `/drama/${id}`, path: PATH },
    );
    await userEvent.click(screen.getByRole('button', { name: 'play other', hidden: true }));
    act(() => rendered.audio.emitPlaying());
    act(() => rendered.audio.emitMetadata(1200));
    act(() => rendered.audio.emitTime(100));
    return rendered;
};
/** 轉頁掣：模擬返主頁再由主頁格 / mini player 入返劇集頁 */
const GoTo = ({ label, to }: { label: string; to: string }) => {
    const navigate = useNavigate();
    return (
        <button type="button" onClick={() => navigate(to)}>
            {label}
        </button>
    );
};
const closeSheet = async () => {
    const dialog = await screen.findByRole('dialog', { name: '全集' });
    await userEvent.click(within(dialog).getByRole('button', { name: /關閉/ }));
};
const arcLine = () =>
    (screen.getByRole('group', { name: '短篇' }).parentElement as HTMLElement).textContent;
const arcChips = () => within(screen.getByRole('group', { name: '短篇' })).getAllByRole('button');

/** 唱片格碟面嘅圖（黑碟就冇） */
const gaugeArt = () => screen.getByRole('main').querySelector('.discArea img');

describe('DramaPage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 香港 23/10（五）16:00
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    describe('series drama', () => {
        it('keeps the disc on the playing season while it plays and another one is browsed', async () => {
            const s2 = seriesEpisodesOf('golden').filter((e) => e.arc === 'Season 2');
            const s2Art = s2[2] ? dramaArtFor(s2[2]) : '';
            saveProgress(s2[2]?.url ?? '', 60, 1200);
            const { audio } = await openDramaAndPlay('golden');
            const discArt = () => screen.getByRole('main').querySelector('img');

            await waitFor(() => expect(audio.src).toBe(s2[2]?.url));
            await waitFor(() => expect(screen.getByRole('button', { name: '暫停' })).toBeVisible());
            expect(discArt()?.getAttribute('src')).toBe(s2Art);

            await userEvent.click(screen.getByRole('button', { name: /^Season 4/ }));
            expect(discArt()?.getAttribute('src')).toBe(s2Art);
            expect(audio.src).toBe(s2[2]?.url);
        });

        it('loads the picked season paused, with its disc and duration, when nothing plays', async () => {
            const golden = seriesEpisodesOf('golden');
            const s2 = golden.filter((e) => e.arc === 'Season 2');
            const s4 = golden.find((e) => e.arc === 'Season 4');
            const s4Art = s4 ? dramaArtFor(s4) : '';
            saveProgress(s2[2]?.url ?? '', 60, 1200);
            const { audio } = await openDramaAndPlay('golden');
            const discArt = () => screen.getByRole('main').querySelector('img');

            await waitFor(() => expect(audio.src).toBe(s2[2]?.url));
            await waitFor(() => expect(screen.getByRole('button', { name: '暫停' })).toBeVisible());
            await userEvent.click(screen.getByRole('button', { name: '暫停' }));
            act(() => audio.emitMetadata(1200));
            expect(screen.getByText(/^已暫停：Season 2 · 第 \d+ 集$/)).toBeInTheDocument();
            const plays = audio.play.mock.calls.length;
            expect(s4Art).not.toBe(dramaArtFor(s2[2] ?? golden[0]!));

            await userEvent.click(screen.getByRole('button', { name: /^Season 4/ }));
            expect(audio.src).toBe(s4?.url);
            expect(discArt()?.getAttribute('src')).toBe(s4Art);
            act(() => audio.emitMetadata(1500));
            expect(screen.getByText('25:00')).toBeVisible();
            // 直版 chips 上面都講埋短篇名；載入咗未開始講「下一集」，清單行講「未開始」
            expect(screen.getByText(`下一集：Season 4 · 第 ${s4?.no} 集`)).toBeInTheDocument();
            expect(screen.getByText('未開始 · 0:00 / 25:00')).toBeInTheDocument();
            expect(audio.play).toHaveBeenCalledTimes(plays);
            expect(screen.getByRole('button', { name: '播放' })).toBeVisible();
        });

        it('keeps the mini player disc on the playing season while another one is browsed', async () => {
            const s2 = seriesEpisodesOf('golden').filter((e) => e.arc === 'Season 2');
            const s2Art = s2[2] ? dramaArtFor(s2[2]) : '';
            saveProgress(s2[2]?.url ?? '', 60, 1200);
            const { audio } = renderWithProviders(
                <>
                    <DramaPage />
                    <MiniArtProbe />
                </>,
                { route: '/drama/golden', path: PATH },
            );
            const miniArt = () => screen.getByTestId('mini-art').dataset.art;
            await pressPlay();

            await waitFor(() => expect(audio.src).toBe(s2[2]?.url));
            expect(miniArt()).toBe(s2Art);

            await userEvent.click(screen.getByRole('button', { name: /^Season 4/ }));
            expect(screen.getByRole('button', { name: /^Season 4/ })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            expect(miniArt()).toBe(s2Art);
        });

        it('waits on entry, then plays where it left off on a light themed page with the drama name as title', async () => {
            listenedBefore();
            const { audio } = openDrama('chisee');
            expect(audio.src).toBe('');
            expect(audio.play).not.toHaveBeenCalled();

            await pressPlay();

            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            expect(audio.play).toHaveBeenCalled();
            expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('芝See菇Bi Family');
            expect(screen.getByRole('main').closest('[data-theme-scope]')).toHaveAttribute(
                'data-scheme',
                'light',
            );
        });

        it('resumes the last episode and lists only its arc, with the arc chip pressed', async () => {
            saveProgress(XMAS[1]?.url ?? '', 120, 1200);
            const { audio } = await openDramaAndPlay('chisee');

            await waitFor(() => expect(audio.src).toBe(XMAS[1]?.url));
            // 未讀到時長：標籤同節目頁日子條一樣講「連線中…」
            const group = screen.getByRole('group', { name: '短篇' }).parentElement as HTMLElement;
            expect(within(group).getByText('連線中…')).toBeInTheDocument();
            act(() => audio.emitMetadata(1200));
            // 「全部」+ 12 個短篇
            expect(arcChips()).toHaveLength(13);
            expect(screen.getByRole('button', { name: 'Ｘ時mas時小提議' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            expect(
                screen.getByText('現正播放：Ｘ時mas時小提議 · 第 2 集 · 哥哥你洽我'),
            ).toBeInTheDocument();
            const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole(
                'button',
            );
            expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
                '播放 不如休養下 第 1 集，未收聽',
                '暫停 哥哥你洽我 第 2 集，播放中 · 2:00 / 20:00',
                '播放 著襪索腳汗 第 3 集，未收聽',
                '播放 認認真真搵返個人 第 4 集，未收聽',
            ]);
        });

        it('switches the list to another arc without interrupting playback, then plays a tapped episode', async () => {
            listenedBefore();
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));

            await userEvent.click(screen.getByRole('button', { name: 'Ｘ時mas時小提議' }));

            expect(audio.src).toBe(CHISEE[0]?.url);
            const list = screen.getByRole('region', { name: '集數' });
            expect(within(list).getAllByRole('button')).toHaveLength(4);
            await userEvent.click(within(list).getByRole('button', { name: /索腳汗/ }));
            await waitFor(() => expect(audio.src).toBe(XMAS[2]?.url));
        });
    });

    describe('first visit to a series drama', () => {
        it('opens 全集 to pick a 短篇 and plays nothing', async () => {
            const { audio } = openDrama('chisee');

            expect(await screen.findByRole('dialog', { name: '全集' })).toBeInTheDocument();
            expect(audio.src).toBe('');
            expect(audio.play).not.toHaveBeenCalled();
            // 未載入任何一集：碟面係冇圖嘅黑碟（同今日冇節目一樣），時間係佔位，掣係播放樣
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('芝See菇Bi Family');
            expect(gaugeArt()).toBeNull();
            expect(screen.getAllByText('--:--')).toHaveLength(2);
            expect(screen.getByRole('button', { name: '播放', hidden: true })).toBeInTheDocument();
        });

        it('loads the picked 短篇 paused after a row is picked', async () => {
            const { audio } = openDrama('chisee');
            const dialog = await screen.findByRole('dialog', { name: '全集' });

            await userEvent.click(
                within(dialog).getByRole('button', { name: '青春期，未聽 · 4 集' }),
            );

            const youth = CHISEE.find((e) => e.arc === '青春期' && e.no === 1);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            await waitFor(() => expect(audio.src).toBe(youth?.url));
            expect(audio.play).not.toHaveBeenCalled();
            // 揀咗短篇：黑碟換做嗰個短篇嘅 cover
            expect(gaugeArt()?.getAttribute('src')).toBe(dramaArtFor(youth!));
            expect(screen.getByRole('button', { name: '青春期' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
        });

        it('plays a 短篇 from its row button', async () => {
            const { audio } = openDrama('chisee');
            const dialog = await screen.findByRole('dialog', { name: '全集' });

            await userEvent.click(
                within(dialog).getByRole('button', { name: '播放 青春期 第 1 集' }),
            );

            const youth = CHISEE.find((e) => e.arc === '青春期' && e.no === 1);
            await waitFor(() => expect(audio.src).toBe(youth?.url));
            expect(audio.play).toHaveBeenCalled();
        });

        it('prompts to pick a 短篇, not 連線中…, once 全集 is closed without a pick', async () => {
            openDrama('chisee');
            await closeSheet();

            expect(arcLine()).toContain('揀一個短篇開始收聽');
            expect(screen.queryByText(/連線中/)).not.toBeInTheDocument();
            const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole(
                'button',
            );
            expect(rows[0]).toHaveAccessibleName(`播放 ${CHISEE[0]?.title ?? ''} 第 1 集，未收聽`);
        });

        it('starts the first episode when play is pressed with nothing loaded', async () => {
            const { audio } = openDrama('chisee');
            await closeSheet();

            await userEvent.click(screen.getByRole('button', { name: '播放' }));

            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            expect(audio.play).toHaveBeenCalled();
        });

        it('still says 連線中… while its own episode is loading', async () => {
            openDrama('chisee');
            await closeSheet();

            await userEvent.click(screen.getByRole('button', { name: '播放' }));

            expect(arcLine()).toContain('連線中…');
        });

        it('opens 全集 again next time while still nothing has been listened to', async () => {
            const { unmount } = openDrama('chisee');
            const dialog = await screen.findByRole('dialog', { name: '全集' });
            await userEvent.click(within(dialog).getByRole('button', { name: /關閉/ }));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            unmount();

            openDrama('chisee');

            expect(await screen.findByRole('dialog', { name: '全集' })).toBeInTheDocument();
        });

        it('keeps the picked 短篇 and 全集 closed when coming back before anything was played', async () => {
            const { audio } = renderWithProviders(
                <>
                    <GoTo label="go home" to="/" />
                    <DramaPage />
                </>,
                {
                    route: '/drama/chisee',
                    path: PATH,
                    extraRoutes: [{ path: '/', element: <GoTo label="back" to="/drama/chisee" /> }],
                },
            );
            const dialog = await screen.findByRole('dialog', { name: '全集' });
            await userEvent.click(
                within(dialog).getByRole('button', { name: '青春期，未聽 · 4 集' }),
            );
            const youth = CHISEE.find((e) => e.arc === '青春期' && e.no === 1);
            expect(screen.getByRole('main').querySelector('img')?.getAttribute('src')).toBe(
                dramaArtFor(youth!),
            );

            // 未播過，所以未有進度；返主頁再入（主頁格或者 mini player）
            await userEvent.click(screen.getByRole('button', { name: 'go home', hidden: true }));
            await userEvent.click(screen.getByRole('button', { name: 'back' }));

            expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
            expect(audio.src).toBe(youth?.url);
            expect(screen.getByRole('button', { name: '青春期' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
        });

        it('keeps 全集 closed and plays nothing on entry once the drama has been listened to', async () => {
            listenedBefore();
            const { audio } = openDrama('chisee');

            await waitFor(() => expect(screen.getByRole('button', { name: '播放' })).toBeVisible());
            expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
            expect(audio.src).toBe('');
            expect(audio.play).not.toHaveBeenCalled();
        });
    });

    describe('while something else plays', () => {
        it('shows its own player as not started, leaving the other playback alone', async () => {
            const { audio } = await openDramaWhileOtherPlays('chisee');
            await closeSheet();

            expect(audio.src).toBe(OTHER_REC.url);
            expect(gaugeArt()).toBeNull();
            expect(screen.getAllByText('--:--')).toHaveLength(2);
            expect(screen.queryByText('1:40')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: '播放' })).toBeVisible();
            expect(screen.queryByRole('button', { name: '暫停' })).not.toBeInTheDocument();
            expect(screen.getByRole('slider', { name: '播放進度' })).toHaveAttribute(
                'aria-valuenow',
                '0',
            );
            expect(arcLine()).toContain('揀一個短篇開始收聽');
            expect(screen.queryByText(/連線中/)).not.toBeInTheDocument();
        });

        it('replaces the other playback with its own episode only when play is pressed', async () => {
            const { audio } = await openDramaWhileOtherPlays('chisee');
            await closeSheet();

            await userEvent.click(screen.getByRole('button', { name: '播放' }));

            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            act(() => audio.emitPlaying());
            act(() => audio.emitMetadata(1200));
            expect(screen.getByRole('button', { name: '暫停' })).toBeVisible();
            expect(screen.getByText('20:00')).toBeVisible();
        });

        it('marks no 短篇 chip as 播緊 while another 短篇 is browsed', async () => {
            const { audio } = await openDramaWhileOtherPlays('chisee');
            await closeSheet();

            await userEvent.click(screen.getByRole('button', { name: '青春期' }));

            // 播緊其他嘢：揀短篇唔載入，碟面保持黑碟
            expect(audio.src).toBe(OTHER_REC.url);
            expect(gaugeArt()).toBeNull();

            const first = screen.getByRole('button', { name: CHISEE[0]?.arc ?? '' });
            expect(first).not.toHaveAccessibleDescription(/播緊/);
        });

        // CUI-0007：揀咗短篇再撳 ▶，播嘅係揀咗嗰個短篇（續聽位置），唔係成套劇第一集
        it('starts the picked 短篇 when play is pressed', async () => {
            const { audio } = await openDramaWhileOtherPlays('golden');
            await closeSheet();
            const season3 = seriesEpisodesOf('golden').find((e) => e.arc === 'Season 3');

            await userEvent.click(screen.getByRole('button', { name: /^Season 3/ }));
            expect(audio.src).toBe(OTHER_REC.url);
            await userEvent.click(screen.getByRole('button', { name: '播放' }));

            await waitFor(() => expect(audio.src).toBe(season3?.url));
            expect(gaugeArt()?.getAttribute('src')).toBe(dramaArtFor(season3!));
        });

        it('starts the drama’s first episode when no 短篇 was picked', async () => {
            const { audio } = await openDramaWhileOtherPlays('golden');
            await closeSheet();

            await userEvent.click(screen.getByRole('button', { name: '播放' }));

            await waitFor(() => expect(audio.src).toBe(seriesEpisodesOf('golden')[0]?.url));
        });

        it('prompts under the disc in landscape too', async () => {
            stubLandscape();
            await openDramaWhileOtherPlays('chisee');

            expect(screen.getAllByText('揀一個短篇開始收聽').length).toBeGreaterThan(0);
            expect(screen.queryByText(/連線中/)).not.toBeInTheDocument();
            expect(screen.queryByText(/^現正播放：/)).not.toBeInTheDocument();
            vi.unstubAllGlobals();
        });
    });

    describe('listened before, not loaded yet', () => {
        const golden = seriesEpisodesOf('golden');
        const s2 = golden.filter((e) => e.arc === 'Season 2');
        const s4 = golden.find((e) => e.arc === 'Season 4');
        const listenedS2 = () => saveProgress(s2[2]?.url ?? '', 60, 1200);

        it('shows the episode to continue on the disc and above the chips, playing nothing', async () => {
            listenedS2();
            const { audio } = openDrama('golden');

            await waitFor(() => expect(gaugeArt()?.getAttribute('src')).toBe(dramaArtFor(s2[2]!)));
            expect(arcLine()).toMatch(new RegExp(`繼續收聽：Season 2 · 第 ${s2[2]?.no} 集`));
            expect(arcLine()).not.toContain('揀一個短篇開始收聽');
            expect(screen.getByRole('button', { name: '播放' })).toBeVisible();
            expect(audio.src).toBe('');
        });

        it('shows where it will resume on both sides of the disc, the ring locked there', async () => {
            listenedS2();
            openDrama('golden');

            const slider = await screen.findByRole('slider', { name: '播放進度' });
            expect(screen.getByText('1:00')).toBeVisible();
            expect(screen.getByText('20:00')).toBeVisible();
            expect(slider).toHaveAttribute('aria-valuenow', '60');
        });

        it('follows a 短篇 picked while something else plays', async () => {
            listenedS2();
            await openDramaWhileOtherPlays('golden');

            await userEvent.click(screen.getByRole('button', { name: /^Season 4/ }));

            expect(gaugeArt()?.getAttribute('src')).toBe(dramaArtFor(s4!));
            expect(arcLine()).toMatch(new RegExp(`繼續收聽：Season 4 · 第 ${s4?.no} 集`));
            // 未聽過嘅短篇：冇續播位置，時間用佔位
            expect(screen.queryByText('1:00')).not.toBeInTheDocument();
            expect(screen.getAllByText('--:--')).toHaveLength(2);
        });

        it('says 繼續收聽 under the disc in landscape', async () => {
            stubLandscape();
            listenedS2();
            openDrama('golden');

            expect(
                await screen.findByText(/^繼續收聽：Season 2 · 第 3 \/ \d+ 集$/),
            ).toBeInTheDocument();
            vi.unstubAllGlobals();
        });
    });

    describe('landscape', () => {
        beforeEach(stubLandscape);
        afterEach(() => vi.unstubAllGlobals());

        it('counts a 第零集 短篇 by position, so its last episode reads 第 26 / 26 集', async () => {
            const chuluen = CHISEE.filter((e) => e.arc === '初戀嗱喳麵');
            saveProgress(chuluen.at(-1)?.url ?? '', 120, 1200);
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(chuluen.at(-1)?.url));
            act(() => audio.emitMetadata(1200));

            expect(screen.getByText('現正播放：初戀嗱喳麵 · 第 26 / 26 集')).toBeInTheDocument();
        });

        it('says 已暫停 under the disc once paused part way', async () => {
            saveProgress(XMAS[1]?.url ?? '', 120, 1200);
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(XMAS[1]?.url));
            act(() => audio.emitMetadata(1200));
            await waitFor(() => expect(screen.getByRole('button', { name: '暫停' })).toBeVisible());

            await userEvent.click(screen.getByRole('button', { name: '暫停' }));
            expect(screen.getByText('已暫停：Ｘ時mas時小提議 · 第 2 / 4 集')).toBeInTheDocument();
            expect(screen.getByText('已暫停 · 2:00 / 20:00')).toBeInTheDocument();
        });

        it('shows the 短篇, position and episode title under the disc, header above the list', async () => {
            saveProgress(XMAS[1]?.url ?? '', 120, 1200);
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(XMAS[1]?.url));
            act(() => audio.emitMetadata(1200));

            expect(screen.getByText('現正播放：Ｘ時mas時小提議 · 第 2 / 4 集')).toBeInTheDocument();
            // 集名：清單行 + 唱片下面第二行
            expect(
                screen.getAllByText('哥哥你洽我', { selector: '[data-marquee-text]' }),
            ).toHaveLength(2);
            const header = screen.getByRole('heading', { level: 1 }).closest('header');
            const chips = screen.getByRole('group', { name: '短篇' });
            expect(header?.parentElement?.parentElement).toContainElement(chips);
        });

        it('opens 全集 inside the list column, leaving the player usable', async () => {
            listenedBefore();
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));

            await userEvent.click(screen.getByRole('button', { name: '全集' }));

            const dialog = screen.getByRole('dialog', { name: '全集' });
            expect(dialog).toHaveAttribute('aria-modal', 'false');
            // 表蓋住嘅 chips + 清單 inert（Tab 唔會入去）
            expect(
                screen.getByRole('group', { name: '短篇', hidden: true }).closest('[inert]'),
            ).not.toBeNull();
            expect(screen.queryByTestId('arc-sheet-backdrop')).not.toBeInTheDocument();
            const chips = screen.getByRole('group', { name: '短篇', hidden: true });
            expect(chips.closest('[inert]')?.parentElement).toContainElement(dialog);
            expect(screen.getByRole('slider', { name: '播放進度' })).toBeInTheDocument();
        });
    });

    it('plays the next episode by itself when one finishes, and the list follows', async () => {
        listenedBefore();
        const { audio } = await openDramaAndPlay('chisee');
        await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
        act(() => audio.emitMetadata(1200));

        act(() => audio.end());

        await waitFor(() => expect(audio.src).toBe(CHISEE[1]?.url));
        const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole('button');
        // 照集數次序：聽完嘅第 1 集留喺原位，播緊第 2 集喺佢下面（入頁會捲到播緊嗰集）
        expect(rows[0]).toHaveAccessibleName(`播放 ${CHISEE[0]?.title ?? ''} 第 1 集，已收聽`);
        expect(rows[1]).toHaveAttribute('aria-current', 'true');
    });

    describe('全集 overview', () => {
        const BIRTHDAY = CHISEE.filter((e) => e.arc === '你生日所以我生日');
        const FRIENDS = CHISEE.filter((e) => e.arc === '好朋友手牽手');

        it('groups 短篇 playing → unfinished → finished, and plays one from its row button', async () => {
            BIRTHDAY.forEach((e) => saveProgress(e.url, 990, 1000));
            saveProgress(FRIENDS[0]?.url ?? '', 990, 1000);
            vi.setSystemTime(new Date('2026-10-23T08:05:00Z')); // 最近聽緊嘅係好朋友手牽手第 2 集
            saveProgress(FRIENDS[1]?.url ?? '', 400, 1000);
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(FRIENDS[1]?.url));

            await userEvent.click(screen.getByRole('button', { name: '全集' }));

            const dialog = screen.getByRole('dialog', { name: '全集' });
            const picks = within(dialog)
                .getAllByRole('button')
                .filter((b) => b.dataset.role === 'pick');
            expect(picks).toHaveLength(12);
            expect(picks[0]).toHaveAccessibleName(
                `好朋友手牽手，播緊第 2 集，聽完 1 / ${FRIENDS.length} 集`,
            );
            expect(picks[1]).toHaveAccessibleName('三十六計，未聽 · 36 集');
            expect(picks[2]).toHaveAccessibleName('初戀嗱喳麵，未聽 · 26 集');
            expect(picks[3]).toHaveAccessibleName('大妒忌，未聽 · 3 集');
            expect(picks.at(-1)).toHaveAccessibleName('你生日所以我生日，聽完 · 3 集');
            expect(within(dialog).getByText('聽完 1 / 12 個')).toBeInTheDocument();

            await userEvent.click(
                within(dialog).getByRole('button', { name: '播放 大妒忌 第 1 集' }),
            );

            const DAJEALOUS = CHISEE.find((e) => e.arc === '大妒忌' && e.no === 1);
            await waitFor(() => expect(audio.src).toBe(DAJEALOUS?.url));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: '大妒忌' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
        });

        it('puts each 短篇’s own disc in its row, falling back to the drama disc', async () => {
            const sammy = seriesEpisodesOf('sammy-kitty');
            // 聽過先會自動播（第一次入唔播，見 first-visit 測試）
            saveProgress(sammy[0]?.url ?? '', 60, 1200);
            const { audio } = await openDramaAndPlay('sammy-kitty');
            await waitFor(() => expect(audio.src).not.toBe(''));
            await userEvent.click(screen.getByRole('button', { name: '全集' }));

            const rows = within(screen.getByRole('dialog', { name: '全集' })).getAllByRole(
                'listitem',
            );
            const shown = rows.map((r) => r.querySelector('img')?.getAttribute('src'));
            // 行嘅讀屏名「短篇名，狀態」→ 攞返短篇名
            const arcOf = (r: HTMLElement) =>
                r.querySelector('[data-role="pick"]')?.getAttribute('aria-label')?.split('，')[0];
            const expected = rows.map((r) => {
                const first = sammy.find((e) => e.arc === arcOf(r));
                return first ? dramaArtFor(first) : undefined;
            });
            expect(shown).toEqual(expected);
            expect(new Set(shown).size).toBe(rows.length);
        });

        it('shows the drama disc on every row when no 短篇 has its own (芝See)', async () => {
            listenedBefore();
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            await userEvent.click(screen.getByRole('button', { name: '全集' }));

            const covers = within(screen.getByRole('dialog', { name: '全集' }))
                .getAllByRole('listitem')
                .map((r) => r.querySelector('img')?.getAttribute('src'));
            expect(covers).toHaveLength(12);
            expect(new Set(covers)).toEqual(new Set([findDrama('chisee')?.theme.art]));
        });

        it('moves the playing 短篇 to the front of the chips, after 全集', async () => {
            listenedBefore();
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            await userEvent.click(screen.getByRole('button', { name: '全集' }));
            await userEvent.click(screen.getByRole('button', { name: '播放 青春期 第 1 集' }));

            const chips = within(screen.getByRole('group', { name: '短篇' })).getAllByRole(
                'button',
            );
            expect(
                chips.slice(0, 3).map((c) => c.getAttribute('aria-label') ?? c.textContent),
            ).toEqual(['全集', '青春期', '三十六計']);
        });

        it('switches the list to a 短篇 picked by its row, without changing playback', async () => {
            listenedBefore();
            const { audio } = await openDramaAndPlay('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            await userEvent.click(screen.getByRole('button', { name: '全集' }));

            await userEvent.click(screen.getByRole('button', { name: '青春期，未聽 · 4 集' }));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: '青春期' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            expect(audio.src).toBe(CHISEE[0]?.url);
        });
    });

    it('treats the disabled 18 樓 C 座 as not found', () => {
        const { audio } = openDrama('c18');

        expect(screen.getByText('找不到此廣播劇')).toBeInTheDocument();
        expect(audio.src).toBe('');
    });

    it('says the drama cannot be found for an unknown id', () => {
        openDrama('nope');

        expect(screen.getByText('找不到此廣播劇')).toBeInTheDocument();
    });
});
