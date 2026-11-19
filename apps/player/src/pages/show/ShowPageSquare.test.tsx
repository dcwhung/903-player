import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShowConfig } from '@903-player/catalog';
import { stubViewport } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { saveProgress } from '../../services/progressStore';
import { ShowPage } from './ShowPage';

/** 示範資料：公子會有簡介（有 ⓘ） */
vi.mock('../../catalog/shows', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/shows')>();
    const withInfo = (show: ShowConfig | undefined): ShowConfig | undefined =>
        show && show.id === 'gongzi' ? { ...show, summary: '節目示範簡介' } : show;
    return { ...actual, findShow: (id: string) => withInfo(actual.findShow(id)) };
});

// HomeView 方形螢幕（SQUARE_QUERY）；390×844 = 現有手機直版
const SQUARE = { width: 544, height: 544 };
const PHONE = { width: 390, height: 844 };
const RECORDINGS = [
    recording('gongzi', '2026-10-17'),
    recording('gongzi', '2026-10-10'),
    recording('gongzi', '2026-10-03'),
];
const ROUTE = { route: '/show/gongzi', path: '/show/:showId', recordings: RECORDINGS };
const LIST_BUTTON = '集數清單，共 3 集';

/** 有進度：唔會自動彈節目資料（第一次入先彈） */
const withProgress = () => saveProgress('show:gongzi:2026-10-10', 60, 600);

describe('ShowPage HomeView（P10 lane 6）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should hide the episode list behind the header list button with the episode count', async () => {
        stubViewport(SQUARE);
        withProgress();
        renderWithProviders(<ShowPage />, ROUTE);

        const button = await screen.findByRole('button', { name: LIST_BUTTON });
        const header = button.closest('header');
        expect(header).not.toBeNull();
        expect(within(header as HTMLElement).getByText('3')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: '集數' })).not.toBeInTheDocument();
        expect(document.querySelector('main')).toHaveAttribute('data-square-player');
    });

    it('should put ⓘ in the header after the list button instead of on the disc', async () => {
        stubViewport(SQUARE);
        withProgress();
        renderWithProviders(<ShowPage />, ROUTE);

        const list = await screen.findByRole('button', { name: LIST_BUTTON });
        const header = list.closest('header') as HTMLElement;
        const buttons = within(header).getAllByRole('button');
        expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
            '返回主頁',
            LIST_BUTTON,
            '節目資料',
        ]);
        expect(screen.getAllByRole('button', { name: '節目資料' })).toHaveLength(1);
    });

    it('should open the episode list sheet from the list button and play a picked episode', async () => {
        stubViewport(SQUARE);
        withProgress();
        const { audio } = renderWithProviders(<ShowPage />, ROUTE);

        await userEvent.click(await screen.findByRole('button', { name: LIST_BUTTON }));

        const sheet = screen.getByRole('dialog', { name: '集數' });
        expect(within(sheet).getByText('共 3 集')).toBeInTheDocument();
        expect(within(sheet).getAllByRole('listitem')).toHaveLength(3);
        await userEvent.click(within(sheet).getByRole('button', { name: /^播放 03\/10/ }));
        expect(audio.src).toBe(RECORDINGS[2]?.url);
    });

    it('should top the episode sheet with the info banner and no fold-out details', async () => {
        // v2.0.1 用戶反饋（2026-11-19，截圖 30）：同資料 sheet 一樣嘅 banner（節目名 + 播放時間）、同一個比例；
        // 冇箭咀，主持 / 簡介唔喺清單出（撳 ⓘ 睇）
        stubViewport(SQUARE);
        withProgress();
        renderWithProviders(<ShowPage />, ROUTE);

        await userEvent.click(await screen.findByRole('button', { name: LIST_BUTTON }));

        const sheet = screen.getByRole('dialog', { name: '集數' });
        const banner = within(sheet).getByTestId('info-banner');
        expect(within(banner).getByRole('heading', { name: '公子會' })).toBeInTheDocument();
        expect(within(banner).getByText(/^逢星期六.*播放$/)).toBeInTheDocument();
        expect(sheet).toHaveAttribute('data-banner-size', 'info');
        expect(within(sheet).queryByRole('button', { name: '節目資料' })).not.toBeInTheDocument();
        expect(within(sheet).queryByText('節目示範簡介')).not.toBeInTheDocument();
        expect(within(sheet).queryByRole('list', { name: '主持' })).not.toBeInTheDocument();
    });

    it('should close the sheet when the list button is pressed again', async () => {
        stubViewport(SQUARE);
        withProgress();
        renderWithProviders(<ShowPage />, ROUTE);
        const button = await screen.findByRole('button', { name: LIST_BUTTON });
        await userEvent.click(button);

        // 開咗之後表係 modal，鍵盤 / 讀屏都喺表入面；直接撳返個掣（同觸控一樣）
        await act(async () => button.click());

        expect(screen.queryByRole('dialog', { name: '集數' })).not.toBeInTheDocument();
        expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should open the sheet at once when entered from 我的收藏 so the focused episode shows', async () => {
        stubViewport(SQUARE);
        renderWithProviders(<ShowPage />, { ...ROUTE, state: { focusId: RECORDINGS[1]?.id } });

        const sheet = await screen.findByRole('dialog', { name: '集數' });
        expect(sheet.querySelector('li[data-focused]')).toHaveAttribute(
            'data-episode-key',
            RECORDINGS[1]?.url,
        );
    });

    it('should give focus to the list button when the sheet auto-opened from 我的收藏 closes', async () => {
        // W-795：自動開冇「撳過嘅掣」，閂咗唔可以跌去 <body>
        stubViewport(SQUARE);
        renderWithProviders(<ShowPage />, { ...ROUTE, state: { focusId: RECORDINGS[1]?.id } });
        await screen.findByRole('dialog', { name: '集數' });

        await userEvent.keyboard('{Escape}');

        expect(screen.queryByRole('dialog', { name: '集數' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: LIST_BUTTON })).toHaveFocus();
    });

    it('should keep the phone layout unchanged: list on the page, ⓘ on the disc, no list button', async () => {
        stubViewport(PHONE);
        withProgress();
        renderWithProviders(<ShowPage />, ROUTE);

        expect(await screen.findByRole('heading', { name: '集數' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: LIST_BUTTON })).not.toBeInTheDocument();
        const info = screen.getByRole('button', { name: '節目資料' });
        expect(info.closest('header')).toBeNull();
        expect(document.querySelector('main')).not.toHaveAttribute('data-square-player');
    });
});
