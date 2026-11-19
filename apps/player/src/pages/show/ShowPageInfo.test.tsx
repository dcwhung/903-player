import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShowConfig } from '@903-player/catalog';
import { stubLandscape, stubViewport } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { saveProgress } from '../../services/progressStore';
import { ShowPage } from './ShowPage';

const info = vi.hoisted(() => ({ enabled: true, art: true }));

/** 示範資料：公子會播放時間 / 主持 / 簡介（真 catalog 未有） */
vi.mock('../../catalog/shows', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/shows')>();
    const withArt = (show: ShowConfig | undefined): ShowConfig | undefined =>
        show && !info.art ? { ...show, tileArt: '' } : show;
    const withInfo = (show: ShowConfig | undefined): ShowConfig | undefined =>
        show && info.enabled && show.id === 'gongzi'
            ? {
                  ...show,
                  airTime: { start: '22:00', end: '23:45' },
                  hosts: ['主持甲', '主持乙'],
                  summary: '節目示範簡介',
              }
            : show;
    return { ...actual, findShow: (id: string) => withArt(withInfo(actual.findShow(id))) };
});

const RECORDINGS = [recording('gongzi', '2026-10-17'), recording('gongzi', '2026-10-10')];
const ROUTE = { route: '/show/gongzi', path: '/show/:showId', recordings: RECORDINGS };
const infoSheet = () => screen.findByRole('dialog', { name: '節目資料' });

describe('ShowPage item info（P9.5 #12）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        info.enabled = true;
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should pop the info sheet on a first visit', async () => {
        renderWithProviders(<ShowPage />, ROUTE);
        const sheet = await infoSheet();
        expect(within(sheet).getByRole('heading', { name: '公子會' })).toBeInTheDocument();
        // v3：播放時間做 banner 細字，下面唔再出「播放時間」段
        const banner = within(sheet).getByTestId('info-banner');
        expect(within(banner).getByText('逢星期六（22:00 - 23:45）播放')).toBeInTheDocument();
        expect(within(sheet).queryByText('播放時間')).not.toBeInTheDocument();
        expect(within(sheet).getByRole('list', { name: '主持' })).toHaveTextContent('主持甲');
        expect(within(sheet).getByText('節目示範簡介')).toBeInTheDocument();
    });

    it('should not pop it when an episode has progress, but open it from ⓘ', async () => {
        saveProgress('show:gongzi:2026-10-10', 60, 600);
        renderWithProviders(<ShowPage />, ROUTE);
        await screen.findByRole('button', { name: '節目資料' });
        await act(async () => {});
        expect(screen.queryByRole('dialog', { name: '節目資料' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '節目資料' }));
        expect(await infoSheet()).toBeInTheDocument();
    });

    it('should not pop it when entered from 我的收藏', async () => {
        // S-743：收藏 tab 帶 episode id（focusId）入頁
        renderWithProviders(<ShowPage />, { ...ROUTE, state: { focusId: RECORDINGS[1]?.id } });
        await screen.findByRole('button', { name: '節目資料' });
        await act(async () => {});
        expect(screen.queryByRole('dialog', { name: '節目資料' })).not.toBeInTheDocument();
    });

    it('should dock the sheet in the player column in landscape', async () => {
        stubLandscape();
        renderWithProviders(<ShowPage />, ROUTE);
        const sheet = await infoSheet();
        expect(sheet).toHaveAttribute('aria-modal', 'false');
        expect(screen.queryByTestId('info-sheet-backdrop')).not.toBeInTheDocument();
    });

    it('should show no ⓘ and pop nothing without info', async () => {
        info.enabled = false;
        renderWithProviders(<ShowPage />, ROUTE);
        await screen.findByRole('slider', { name: '播放進度' });
        await act(async () => {});
        expect(screen.queryByRole('button', { name: '節目資料' })).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

/*
 * v2.0.1 用戶反饋（2026-11-19，截圖 30）：每部裝置嘅節目頁集數清單頂都有資料 sheet 嘅 banner
 * （圖 + 節目名 + 播放時間），喺「集數 / 共 N 集」上面；主持 / 簡介唔喺清單出（撳 ⓘ 睇）
 */
describe('ShowPage episode list banner', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        info.enabled = true;
        info.art = true;
        // 有進度：唔自動彈資料 sheet（佢都有 banner）
        saveProgress('show:gongzi:2026-10-10', 60, 600);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        info.art = true;
    });

    const listBanner = async () => {
        const region = await screen.findByRole('region', { name: '集數' });
        return { region, banner: within(region).getByTestId('info-banner') };
    };

    it.each([
        ['phone portrait', { width: 390, height: 844 }],
        ['phone landscape', { width: 844, height: 390 }],
        ['tablet', { width: 820, height: 1180 }],
        ['desktop', { width: 1280, height: 800 }],
        ['Duo cover portrait', { width: 426, height: 612 }],
        ['Duo open portrait', { width: 612, height: 876 }],
        ['Duo cover landscape', { width: 612, height: 426 }],
        ['Duo open landscape', { width: 876, height: 612 }],
    ])('should top the list with the name and air time on %s', async (_, viewport) => {
        stubViewport(viewport);
        renderWithProviders(<ShowPage />, ROUTE);

        const { region, banner } = await listBanner();
        // 頁頭 h1 已經係節目名：清單 banner 嘅名唔再做 heading（讀屏唔會有兩個同名標題）
        expect(within(banner).getByText('公子會')).toBeInTheDocument();
        expect(within(banner).queryByRole('heading')).not.toBeInTheDocument();
        expect(within(banner).getByText('逢星期六（22:00 - 23:45）播放')).toBeInTheDocument();
        expect(banner).toHaveAttribute('data-placement', 'list');
        const heading = within(region).getByRole('heading', { name: '集數' });
        expect(
            banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('should leave the hosts, summary and any expand arrow out of the list', async () => {
        stubViewport({ width: 390, height: 844 });
        renderWithProviders(<ShowPage />, ROUTE);

        const { region } = await listBanner();
        expect(within(region).queryByRole('list', { name: '主持' })).not.toBeInTheDocument();
        expect(within(region).queryByText('節目示範簡介')).not.toBeInTheDocument();
        expect(within(region).queryByRole('button', { name: '節目資料' })).not.toBeInTheDocument();
    });

    it('should have no banner when the show has no tile art (like the info sheet)', async () => {
        info.art = false;
        stubViewport({ width: 390, height: 844 });
        renderWithProviders(<ShowPage />, ROUTE);

        const region = await screen.findByRole('region', { name: '集數' });
        expect(within(region).queryByTestId('info-banner')).not.toBeInTheDocument();
    });
});

/** Duo 打開・直（_mockups_/iphone-duo）；HomeView 方形螢幕（SQUARE_QUERY，ⓘ 喺頁頭） */
const DUO_OPEN_PORTRAIT = { width: 612, height: 876 };
const SQUARE = { width: 544, height: 544 };

/*
 * 用戶 2026-11-18 決定（QA Observation 1）：第一次入自動彈嘅「節目資料」（打開前冇焦點），
 * 閂咗焦點返 ⓘ（直版 / 橫版 / Duo 喺唱片圈，HomeView 喺頁頭），唔好跌去 <body>
 */
describe('ShowPage auto-opened info sheet focus return', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        info.enabled = true;
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    const escapeAutoOpened = async () => {
        renderWithProviders(<ShowPage />, ROUTE);
        await infoSheet();
        await userEvent.keyboard('{Escape}');
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: '節目資料' })).not.toBeInTheDocument(),
        );
        return screen.getByRole('button', { name: '節目資料' });
    };

    it('should return focus to ⓘ on the disc in portrait', async () => {
        expect(await escapeAutoOpened()).toHaveFocus();
    });

    it('should return focus to ⓘ in landscape (docked sheet)', async () => {
        stubLandscape();
        expect(await escapeAutoOpened()).toHaveFocus();
    });

    it('should return focus to ⓘ on Duo open portrait', async () => {
        stubViewport(DUO_OPEN_PORTRAIT);
        expect(await escapeAutoOpened()).toHaveFocus();
    });

    it('should return focus to the header ⓘ on HomeView', async () => {
        stubViewport(SQUARE);
        const button = await escapeAutoOpened();
        expect(button.closest('header')).not.toBeNull();
        expect(button).toHaveFocus();
    });
});
