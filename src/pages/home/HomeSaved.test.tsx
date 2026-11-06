import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../../catalog/dramas';
import {
    addBookmark,
    hasBookmark,
    listBookmarks,
    removeBookmark,
} from '../../services/bookmarkStore';
import { saveProgress } from '../../services/progressStore';
import type { SeriesEpisode } from '../../types/drama';
import { focusUrlFromState } from '../../hooks/useEpisodeFocus';
import { SWIPE_REMOVE_RATIO } from '../../components/pages/home/SavedTab/useRowSwipe';
import { HomeSaved } from './HomeSaved';

const GONGZI_NEW = recording('gongzi', '2026-10-17');
const GONGZI_OLD = recording('gongzi', '2026-10-03');
const BADGIRL = recording('badgirl', '2026-10-15', '1000');
const SUNNY = recording('sunnyday', '2026-10-19', '0600');
const CHISEE = seriesEpisodesOf('chisee');
const ARC = (CHISEE[0] as SeriesEpisode).arc;
const IN_ARC = CHISEE.filter((e) => e.arc === ARC);
const RECORDINGS = [GONGZI_NEW, GONGZI_OLD, BADGIRL, SUNNY];
const RIGHT = { side: 'none', card: null } as const;
const ROW_WIDTH = 300;

const FocusProbe = () => {
    const location = useLocation();
    return (
        <div data-testid="page">
            {location.pathname} {focusUrlFromState(location.state) ?? ''}
        </div>
    );
};

const openSaved = (layout: 'phone' | 'land' | 'wide' = 'phone') =>
    renderWithProviders(<HomeSaved layout={layout} right={RIGHT} />, {
        recordings: RECORDINGS,
        extraRoutes: [
            { path: '/show/:showId', element: <FocusProbe /> },
            { path: '/drama/:dramaId', element: <FocusProbe /> },
        ],
    });

/** 收藏先後：GONGZI_OLD（最舊）→ 芝See 第 2 集 → BADGIRL → GONGZI_NEW（最新） */
const bookmarkSample = () => {
    addBookmark(GONGZI_OLD, 1);
    addBookmark(IN_ARC[1] as SeriesEpisode, 2);
    addBookmark(BADGIRL, 3);
    addBookmark(GONGZI_NEW, 4);
};

const boxTitles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
const rowOpen = (name: RegExp) => screen.getByRole('button', { name });

describe('HomeSaved (我的收藏 tab)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T14:30:00Z'));
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should group bookmarks into one box per show / drama, newest first, with arc headings', () => {
        bookmarkSample();
        openSaved();

        expect(boxTitles()).toEqual(['公子會', 'Bad Girl大過佬', '芝See菇Bi Family']);
        expect(screen.getByRole('heading', { level: 3, name: ARC })).toBeInTheDocument();
        const gongzi = screen.getAllByRole('article')[0] as HTMLElement;
        expect(
            within(gongzi)
                .getAllByRole('button', { name: /^開啟/ })
                .map((b) => b.getAttribute('aria-label')),
        ).toEqual(['開啟 公子會 17/10 星期六，未收聽', '開啟 公子會 03/10 星期六，未收聽']);
    });

    // A3 + B3：讀屏日子「17/10 星期六」；短篇劇名「劇名 · 短篇名」
    it('should read the series drama name with the separator and the date in full', () => {
        bookmarkSample();
        openSaved();

        expect(
            screen.getByRole('button', { name: `開啟 芝See菇Bi Family · ${ARC} 第 2 集，未收聽` }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('17/10（六）')).not.toHaveLength(0);
    });

    it('should show saved progress on each row', () => {
        bookmarkSample();
        saveProgress(GONGZI_OLD.url, 190, 570);
        openSaved();

        expect(rowOpen(/^開啟 公子會 03\/10/)).toHaveAccessibleName(
            '開啟 公子會 03/10 星期六，聽到 3:10 / 9:30',
        );
    });

    it('should open the episode page with the episode focused, without playing', async () => {
        bookmarkSample();
        const { audio } = openSaved();

        await userEvent.click(rowOpen(/^開啟 Bad Girl大過佬/));

        expect(screen.getByTestId('page')).toHaveTextContent(`/show/badgirl ${BADGIRL.url}`);
        expect(audio.play).not.toHaveBeenCalled();
    });

    it('should play in place from ▷ and turn the row into 播放中 with ⏸', async () => {
        bookmarkSample();
        const { audio } = openSaved();

        await userEvent.click(screen.getByRole('button', { name: '播放 公子會 03/10 星期六' }));
        act(() => audio.emitPlaying());

        expect(audio.src).toBe(GONGZI_OLD.url);
        expect(screen.queryByTestId('page')).not.toBeInTheDocument();
        expect(rowOpen(/^開啟 公子會 03\/10/)).toHaveAccessibleName(
            '開啟 公子會 03/10 星期六，播放中',
        );
        await userEvent.click(screen.getByRole('button', { name: '暫停 公子會 03/10 星期六' }));
        expect(audio.pause).toHaveBeenCalled();
    });

    describe('swipe left to remove', () => {
        beforeEach(() => {
            vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(ROW_WIDTH);
        });

        const swipeRow = (row: HTMLElement, dx: number) => {
            const card = row.querySelector('div') as HTMLElement;
            fireEvent.pointerDown(card, { clientX: 250, clientY: 10, pointerId: 1 });
            fireEvent.pointerMove(card, { clientX: 250 + dx / 2, clientY: 11, pointerId: 1 });
            fireEvent.pointerMove(card, { clientX: 250 + dx, clientY: 11, pointerId: 1 });
            fireEvent.pointerUp(card, { clientX: 250 + dx, clientY: 11, pointerId: 1 });
            return card;
        };
        const rowOf = (name: RegExp) => rowOpen(name).closest('li') as HTMLElement;

        it('should spring back when let go before 40% of the row', () => {
            bookmarkSample();
            openSaved();

            const card = swipeRow(
                rowOf(/^開啟 公子會 03\/10/),
                -ROW_WIDTH * (SWIPE_REMOVE_RATIO - 0.1),
            );

            expect(card.style.transform).toBe('');
            expect(hasBookmark(GONGZI_OLD.url)).toBe(true);
        });

        it('should remove the episode past 40% and not open its page', async () => {
            bookmarkSample();
            openSaved();

            swipeRow(rowOf(/^開啟 公子會 03\/10/), -ROW_WIDTH * (SWIPE_REMOVE_RATIO + 0.1));

            await waitFor(() => expect(hasBookmark(GONGZI_OLD.url)).toBe(false));
            expect(screen.queryByRole('button', { name: /^開啟 公子會 03\/10/ })).toBeNull();
            expect(screen.queryByTestId('page')).not.toBeInTheDocument();
        });

        it('should take the whole box away with its last episode', async () => {
            bookmarkSample();
            openSaved();

            swipeRow(rowOf(/^開啟 Bad Girl/), -ROW_WIDTH);

            await waitFor(() => expect(boxTitles()).toEqual(['公子會', '芝See菇Bi Family']));
        });

        it('should also remove with the Delete key (keyboard alternative)', async () => {
            bookmarkSample();
            openSaved();

            rowOpen(/^開啟 Bad Girl/).focus();
            await userEvent.keyboard('{Delete}');

            await waitFor(() => expect(hasBookmark(BADGIRL.url)).toBe(false));
            expect(listBookmarks()).toHaveLength(3);
        });
    });

    describe('最近收聽', () => {
        it('should list the latest listens that are not bookmarked, newest first', () => {
            addBookmark(GONGZI_NEW, 1);
            saveProgress(BADGIRL.url, 60, 600);
            vi.setSystemTime(new Date('2026-10-19T14:31:00Z'));
            saveProgress(SUNNY.url, 60, 600);
            saveProgress(GONGZI_NEW.url, 60, 600);
            saveProgress('https://example.com/unknown.aac', 60, 600);
            openSaved();

            const recent = screen.getByRole('region', { name: '最近收聽' });
            expect(
                within(recent)
                    .getAllByRole('button', { name: /^開啟/ })
                    .map((b) => b.getAttribute('aria-label')),
            ).toEqual(['開啟 在晴朗的一天出發 19/10 星期一', '開啟 Bad Girl大過佬 15/10 星期四']);
        });

        it('should not show the panel without any listening history', () => {
            addBookmark(GONGZI_NEW, 1);
            openSaved();

            expect(screen.queryByRole('region', { name: '最近收聽' })).not.toBeInTheDocument();
        });

        it('should bookmark from ☆ and move the episode into the boxes', async () => {
            addBookmark(GONGZI_NEW, 1);
            saveProgress(BADGIRL.url, 60, 600);
            openSaved();

            await userEvent.click(
                screen.getByRole('button', { name: '收藏 Bad Girl大過佬 15/10 星期四' }),
            );

            expect(hasBookmark(BADGIRL.url)).toBe(true);
            expect(boxTitles()).toEqual(['Bad Girl大過佬', '公子會']);
        });

        it('should open the page without playing when a recent row is tapped', async () => {
            addBookmark(GONGZI_NEW, 1);
            saveProgress(SUNNY.url, 60, 600);
            const { audio } = openSaved();

            await userEvent.click(screen.getByRole('button', { name: /^開啟 在晴朗的一天出發/ }));

            expect(screen.getByTestId('page')).toHaveTextContent(`/show/sunnyday ${SUNNY.url}`);
            expect(audio.play).not.toHaveBeenCalled();
        });
    });

    // _mockups_/qr-transfer ① B / ②：冇收藏、有收聽記錄 = 成個 tab 區係最近收聽
    describe('最近收聽 only (no bookmarks)', () => {
        const listenToThree = () => {
            saveProgress(BADGIRL.url, 60, 600);
            vi.setSystemTime(new Date('2026-10-19T14:31:00Z'));
            saveProgress(SUNNY.url, 60, 600);
            vi.setSystemTime(new Date('2026-10-19T14:32:00Z'));
            saveProgress(GONGZI_OLD.url, 60, 600);
        };
        const recentRegion = () => screen.getByRole('region', { name: '最近收聽' });
        const listOf = (region: HTMLElement) => region.querySelector('ul') as HTMLElement;

        it('should fill the tab with the recent list, newest first, and no saved boxes', () => {
            listenToThree();
            const { container } = openSaved();

            expect(screen.queryByRole('article')).not.toBeInTheDocument();
            expect(screen.queryByRole('region', { name: '我的收藏' })).not.toBeInTheDocument();
            expect(recentRegion()).toHaveAttribute('data-fill', 'true');
            expect(
                within(recentRegion())
                    .getAllByRole('button', { name: /^開啟/ })
                    .map((b) => b.getAttribute('aria-label')),
            ).toEqual([
                '開啟 公子會 03/10 星期六',
                '開啟 在晴朗的一天出發 19/10 星期一',
                '開啟 Bad Girl大過佬 15/10 星期四',
            ]);
            expect(container.querySelector('[data-saved-mode]')).toHaveAttribute(
                'data-saved-mode',
                'recent',
            );
        });

        it('should list in one column on a phone and two on the landscape layouts', () => {
            listenToThree();
            const phone = openSaved('phone');
            expect(listOf(recentRegion()).style.columnCount).toBe('1');
            phone.unmount();

            const land = openSaved('land');
            expect(listOf(recentRegion()).style.columnCount).toBe('2');
            land.unmount();

            openSaved('wide');
            expect(listOf(recentRegion()).style.columnCount).toBe('2');
        });

        it('should open the page without playing when a row is tapped', async () => {
            listenToThree();
            const { audio } = openSaved();

            await userEvent.click(screen.getByRole('button', { name: /^開啟 在晴朗的一天出發/ }));

            expect(screen.getByTestId('page')).toHaveTextContent(`/show/sunnyday ${SUNNY.url}`);
            expect(audio.play).not.toHaveBeenCalled();
        });

        it('should turn into the saved boxes once ☆ is tapped', async () => {
            listenToThree();
            openSaved();

            await userEvent.click(
                screen.getByRole('button', { name: '收藏 Bad Girl大過佬 15/10 星期四' }),
            );

            expect(hasBookmark(BADGIRL.url)).toBe(true);
            await waitFor(() => expect(boxTitles()).toEqual(['Bad Girl大過佬', '最近收聽']));
            expect(screen.getByRole('region', { name: '我的收藏' })).toBeInTheDocument();
        });
    });

    // 收藏由有變冇 / 由冇變有：舊內容淡出、新內容淡入（減少動態 = 直接換）
    describe('switching between 我的收藏 and 最近收聽', () => {
        const stubMotion = (reduced: boolean) =>
            vi.stubGlobal(
                'matchMedia',
                vi.fn((query: string) => ({
                    matches: reduced && query.includes('prefers-reduced-motion'),
                    media: query,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                })),
            );
        const panes = (container: HTMLElement) =>
            [...container.querySelectorAll<HTMLElement>('[data-saved-mode]')].map((pane) => ({
                mode: pane.dataset.savedMode,
                leaving: pane.hasAttribute('data-leaving'),
                entering: pane.hasAttribute('data-entering'),
            }));
        // 直接改 store（左滑 / Delete 嘅滑走時間都係讀同一個 token，見 useRowSwipe；呢度淨係睇內容點換）
        const removeLast = () => act(() => removeBookmark(GONGZI_NEW.url));

        // 淡出時長 token（後備 timer 讀佢）：設長啲，斷言期間唔會自己拆走
        const FADE_VAR = '--view-transition-fade';
        beforeEach(() => document.documentElement.style.setProperty(FADE_VAR, '60s'));
        afterEach(() => {
            vi.unstubAllGlobals();
            document.documentElement.style.removeProperty(FADE_VAR);
        });

        it('should take the old pane away after the fade time even without animation events', async () => {
            stubMotion(false);
            document.documentElement.style.setProperty(FADE_VAR, '50ms');
            addBookmark(GONGZI_NEW, 1);
            saveProgress(BADGIRL.url, 60, 600);
            const { container } = openSaved();

            removeLast();

            await waitFor(() => expect(container.querySelector('[data-leaving]')).toBeNull());
            expect(panes(container)).toEqual([{ mode: 'recent', leaving: false, entering: true }]);
        });

        it('should fade the saved boxes out and the recent list in when the last bookmark goes', async () => {
            stubMotion(false);
            addBookmark(GONGZI_NEW, 1);
            saveProgress(BADGIRL.url, 60, 600);
            const { container } = openSaved();
            expect(panes(container)).toEqual([{ mode: 'saved', leaving: false, entering: false }]);

            removeLast();

            expect(panes(container)).toEqual([
                { mode: 'recent', leaving: false, entering: true },
                { mode: 'saved', leaving: true, entering: false },
            ]);
            const leaving = container.querySelector('[data-leaving]') as HTMLElement;
            expect(leaving).toHaveAttribute('inert');
            expect(leaving).toHaveAttribute('aria-hidden', 'true');
            fireEvent.animationEnd(leaving);
            expect(panes(container)).toEqual([{ mode: 'recent', leaving: false, entering: true }]);
        });

        it('should not leave the old pane stuck when its fade is cancelled', async () => {
            stubMotion(false);
            addBookmark(GONGZI_NEW, 1);
            saveProgress(BADGIRL.url, 60, 600);
            const { container } = openSaved();

            removeLast();
            const leaving = container.querySelector('[data-leaving]') as HTMLElement;
            act(() => void leaving.dispatchEvent(new Event('animationcancel')));

            expect(container.querySelector('[data-leaving]')).toBeNull();
        });

        it('should ignore animations of elements inside the leaving pane', async () => {
            stubMotion(false);
            addBookmark(GONGZI_NEW, 1);
            saveProgress(BADGIRL.url, 60, 600);
            const { container } = openSaved();

            removeLast();
            const leaving = container.querySelector('[data-leaving]') as HTMLElement;
            fireEvent.animationEnd(leaving.querySelector('li') as HTMLElement);

            expect(container.querySelector('[data-leaving]')).not.toBeNull();
        });

        it('should swap straight away with reduced motion', async () => {
            stubMotion(true);
            addBookmark(GONGZI_NEW, 1);
            saveProgress(BADGIRL.url, 60, 600);
            const { container } = openSaved();

            removeLast();

            expect(panes(container)).toEqual([{ mode: 'recent', leaving: false, entering: false }]);
        });
    });

    it('should span a single bookmark across the full width as a solo box', () => {
        addBookmark(GONGZI_NEW, 1);
        const { container } = openSaved('wide');

        const section = container.querySelector('section[data-layout]') as HTMLElement;
        expect(section).toHaveAttribute('data-solo', 'true');
        expect(container.querySelector('ul')?.style.columnCount).toBe('1');
    });

    it('should use two columns on the wide layout with several boxes', () => {
        bookmarkSample();
        const { container } = openSaved('wide');

        expect(container.querySelector('section[data-layout]')).toHaveAttribute(
            'data-solo',
            'false',
        );
        expect(container.querySelector('ul')?.style.columnCount).toBe('2');
    });
});
