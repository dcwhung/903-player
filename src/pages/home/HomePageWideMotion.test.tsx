import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubWideLandscape } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../../catalog/dramas';
import {
    openHomePlayerCard,
    useReopenHomePlayerCardOnPlay,
} from '../../hooks/homePlayerCardClosed';
import { restoreMiniPlayer, useRestoreMiniPlayerOnPlay } from '../../hooks/miniPlayerDismissed';
import { saveProgress } from '../../services/progressStore';
import { withViewTransition } from '../../utils/viewTransition';
import { HomePage } from './HomePage';

const SHOW_CARD = '正在播放（今日節目）';
const DRAMA_CARD = '正在播放（廣播劇）';
const CLOSE = '關閉播放器';
const RECORDINGS = [
    recording('badgirl', '2026-10-19', '1000'),
    recording('wanni', '2026-10-19', '1300'),
];
const CHISEE = '芝See菇Bi Family';
const JIM = '少爺占系列';

/**
 * 似真嘅 startViewTransition：記低過場款式，update 等測試 flush 先行
 * （真瀏覽器影完舊畫面先叫），中間 DOM 應該仲係舊畫面
 */
const stubViewTransitions = () => {
    const kinds: (string | undefined)[] = [];
    const updates: (() => void)[] = [];
    const never = new Promise<void>(() => {});
    Object.defineProperty(document, 'startViewTransition', {
        value: (update: () => void) => {
            kinds.push(document.documentElement.dataset.viewTransition);
            updates.push(update);
            return { finished: never, ready: never, updateCallbackDone: never };
        },
        configurable: true,
    });
    const flush = () => act(() => updates.splice(0).forEach((update) => update()));
    return { kinds, flush };
};

/** 廣播劇 tab 某套劇嘅「繼續收聽」掣（要有進度先有） */
const resumeButton = (name: string) =>
    screen.getByRole('button', { name: new RegExp(`^${name}，繼續收聽`) });

const openDramasTab = () => userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

/** 同 App（PlaybackObservers）一樣：開始播就再出返 mini player 同張卡 */
const HomeInApp = () => {
    useRestoreMiniPlayerOnPlay();
    useReopenHomePlayerCardOnPlay();
    return <HomePage />;
};

const HANDLE = /^已暫停：Bad Girl大過佬/;
const handle = () => screen.queryByRole('button', { name: HANDLE });

/** 撳 ✕ 閂卡（過場行埋），轉做 fillWithHandle + 右邊把手 */
const closeCard = async (vt: { flush: () => void }) => {
    await screen.findByRole('region', { name: SHOW_CARD });
    await userEvent.click(screen.getByRole('button', { name: CLOSE }));
    vt.flush();
};

const layout = () => screen.getByRole('main').getAttribute('data-layout');

describe('HomePage wide player card motion', () => {
    let vt: ReturnType<typeof stubViewTransitions>;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
        saveProgress(seriesEpisodesOf('chisee')[0]?.url ?? '', 250, 1000);
        saveProgress(seriesEpisodesOf('jim')[0]?.url ?? '', 250, 1000);
        vt = stubViewTransitions();
    });
    afterEach(() => {
        vt.flush();
        Reflect.deleteProperty(document, 'startViewTransition');
        delete document.documentElement.dataset.viewTransition;
        vi.useRealTimers();
        vi.unstubAllGlobals();
        localStorage.clear();
        openHomePlayerCard();
        restoreMiniPlayer();
    });

    it('should bring the card in through the open transition when a drama is resumed with no card', async () => {
        stubWideLandscape();
        renderWithProviders(<HomePage />);
        await openDramasTab();

        await userEvent.click(resumeButton(CHISEE));

        // 瀏覽器影緊舊畫面：仲係冇卡嘅版面
        expect(vt.kinds).toEqual(['open']);
        expect(layout()).toBe('fill');
        expect(screen.queryByRole('region', { name: DRAMA_CARD })).not.toBeInTheDocument();
        vt.flush();
        expect(layout()).toBe('split');
        expect(screen.getByRole('region', { name: DRAMA_CARD })).toHaveTextContent(CHISEE);
    });

    it('should flip the card, keeping the old content until the browser has captured it', async () => {
        stubWideLandscape();
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await screen.findByRole('region', { name: SHOW_CARD });
        await openDramasTab();

        await userEvent.click(resumeButton(JIM));

        expect(vt.kinds).toEqual(['switch']);
        expect(screen.getByRole('region', { name: SHOW_CARD })).toHaveTextContent('Bad Girl');
        vt.flush();
        expect(screen.getByRole('region', { name: DRAMA_CARD })).toHaveTextContent(JIM);
    });

    it('should flip again when another drama is resumed over a drama', async () => {
        stubWideLandscape();
        renderWithProviders(<HomePage />);
        await openDramasTab();
        await userEvent.click(resumeButton(CHISEE));
        vt.flush();

        await userEvent.click(resumeButton(JIM));

        expect(vt.kinds).toEqual(['open', 'switch']);
        vt.flush();
        expect(screen.getByRole('region', { name: DRAMA_CARD })).toHaveTextContent(JIM);
    });

    it('should not flip when swiping between today’s shows on the card', async () => {
        stubWideLandscape();
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        const card = await screen.findByRole('region', { name: SHOW_CARD });
        const header = within(card).getByRole('button', { name: '開啟 Bad Girl大過佬 節目頁' });

        fireEvent.pointerDown(header, { clientX: 300, clientY: 10 });
        fireEvent.pointerUp(header, { clientX: 150, clientY: 10 });

        expect(card).toHaveTextContent('雲妮鍾情');
        expect(vt.kinds).toEqual([]);
    });

    it('should reopen from the handle with a single open transition', async () => {
        stubWideLandscape();
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await screen.findByRole('region', { name: SHOW_CARD });
        await userEvent.click(screen.getByRole('button', { name: CLOSE }));
        vt.flush();

        await userEvent.click(screen.getByRole('button', { name: /^已暫停：Bad Girl大過佬/ }));
        vt.flush();

        expect(vt.kinds).toEqual(['close', 'open']);
        expect(layout()).toBe('split');
        expect(handle()).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: SHOW_CARD })).toBeInTheDocument();
    });

    it('should keep the handle in the old view until the open transition updates when a drama is resumed', async () => {
        stubWideLandscape();
        renderWithProviders(<HomeInApp />, { recordings: RECORDINGS });
        await closeCard(vt);
        await openDramasTab();

        await userEvent.click(resumeButton(CHISEE));

        // 瀏覽器影緊舊畫面：把手要喺舊 snapshot 入面，張卡 slide 入時把手先淡走
        expect(vt.kinds).toEqual(['close', 'open']);
        expect(layout()).toBe('fillWithHandle');
        expect(handle()).toBeInTheDocument();
        vt.flush();
        expect(layout()).toBe('split');
        expect(handle()).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: DRAMA_CARD })).toHaveTextContent(CHISEE);
        expect(vt.kinds).toEqual(['close', 'open']);
    });

    it('should drop the handle straight away when the open transition is skipped', async () => {
        stubWideLandscape();
        renderWithProviders(<HomeInApp />, { recordings: RECORDINGS });
        await closeCard(vt);
        await openDramasTab();
        // 另一個過場未 update：開卡唔做動畫，直接轉
        withViewTransition(() => undefined, 'expand');

        await userEvent.click(resumeButton(CHISEE));

        expect(layout()).toBe('split');
        expect(handle()).not.toBeInTheDocument();
    });

    it('should drop the handle straight away when a drama is resumed with reduced motion', async () => {
        stubWideLandscape({ reducedMotion: true });
        renderWithProviders(<HomeInApp />, { recordings: RECORDINGS });
        await closeCard(vt);
        await openDramasTab();

        await userEvent.click(resumeButton(CHISEE));

        expect(vt.kinds).toEqual([]);
        expect(layout()).toBe('split');
        expect(handle()).not.toBeInTheDocument();
    });

    it('should switch straight away, with no transition, when the user prefers reduced motion', async () => {
        stubWideLandscape({ reducedMotion: true });
        renderWithProviders(<HomePage />, { recordings: RECORDINGS });
        await screen.findByRole('region', { name: SHOW_CARD });
        await openDramasTab();

        await userEvent.click(resumeButton(JIM));

        expect(vt.kinds).toEqual([]);
        expect(screen.getByRole('region', { name: DRAMA_CARD })).toHaveTextContent(JIM);
    });
});
