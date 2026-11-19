import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Drama } from '@903-player/catalog';
import { stubViewport } from '../../../tests/landscape';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { dailyEpisodesOf } from '../../catalog/dramas';
import { saveProgress } from '../../services/progressStore';
import { DramaPage } from './DramaPage';

// 18 樓 C 座暫時停用：當佢開咗，再加示範簡介（真 catalog 未有）
vi.mock('../../catalog/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas')>();
    const withSummary = (drama: Drama | undefined): Drama | undefined =>
        drama && { ...drama, summary: '每日劇示範簡介' };
    return { ...actual, findEnabledDrama: (id: string) => withSummary(actual.findDrama(id)) };
});

const C18 = dailyEpisodesOf('c18');
const openC18 = () =>
    renderWithProviders(<DramaPage />, { route: '/drama/c18', path: '/drama/:dramaId' });

describe('DailyDramaPage item info（P9.5 #12）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    it('should pop the drama info sheet on a first visit', async () => {
        openC18();
        const sheet = await screen.findByRole('dialog', { name: '劇集資料' });
        expect(within(sheet).getByText('每日劇示範簡介')).toBeInTheDocument();
    });

    it('should return focus to ⓘ when the auto-opened sheet closes (no opener)', async () => {
        // 用戶 2026-11-18 決定：自動彈冇撳過掣，閂咗焦點返 ⓘ，唔好跌去 <body>
        openC18();
        await screen.findByRole('dialog', { name: '劇集資料' });
        await userEvent.keyboard('{Escape}');
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: '劇集資料' })).not.toBeInTheDocument(),
        );
        expect(screen.getByRole('button', { name: '劇集資料' })).toHaveFocus();
    });

    it('should not pop it when entered from 我的收藏 (focusId)', async () => {
        renderWithProviders(<DramaPage />, {
            route: '/drama/c18',
            path: '/drama/:dramaId',
            state: { focusId: C18[0]?.id },
        });
        await screen.findByRole('button', { name: '劇集資料' });
        await act(async () => {});
        expect(screen.queryByRole('dialog', { name: '劇集資料' })).not.toBeInTheDocument();
    });

    it('should not pop it with progress, but open it from ⓘ', async () => {
        saveProgress(C18[0]?.id ?? '', 60, 600);
        openC18();
        await screen.findByRole('button', { name: '劇集資料' });
        await act(async () => {});
        expect(screen.queryByRole('dialog', { name: '劇集資料' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '劇集資料' }));
        expect(await screen.findByRole('dialog', { name: '劇集資料' })).toBeInTheDocument();
    });
});

/*
 * v2.0.1 用戶反饋（2026-11-19）：每部裝置嘅每日劇集數清單頂都有資料 sheet 嘅 banner（圖 + 劇集名），
 * 喺「集數 / 共 N 集」上面；簡介唔喺清單出（撳 ⓘ 睇）
 */
describe('DailyDramaPage episode list banner', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        // 有進度：唔自動彈資料 sheet（佢都有 banner）
        saveProgress(C18[0]?.id ?? '', 60, 600);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it.each([
        ['phone portrait', { width: 390, height: 844 }],
        ['phone landscape', { width: 844, height: 390 }],
        ['tablet', { width: 820, height: 1180 }],
        ['desktop', { width: 1280, height: 800 }],
        ['Duo cover portrait', { width: 426, height: 612 }],
        ['Duo open portrait', { width: 612, height: 876 }],
        ['Duo cover landscape', { width: 612, height: 426 }],
        ['Duo open landscape', { width: 876, height: 612 }],
    ])(
        'should top the list with the drama name on %s, without the summary',
        async (_, viewport) => {
            stubViewport(viewport);
            openC18();

            const region = await screen.findByRole('region', { name: '集數' });
            const banner = within(region).getByTestId('info-banner');
            expect(within(banner).getByText('18 樓 C 座')).toBeInTheDocument();
            expect(within(banner).queryByRole('heading')).not.toBeInTheDocument();
            const heading = within(region).getByRole('heading', { name: '集數' });
            expect(
                banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
            expect(within(region).queryByText('每日劇示範簡介')).not.toBeInTheDocument();
            expect(
                within(region).queryByRole('button', { name: '劇集資料' }),
            ).not.toBeInTheDocument();
        },
    );
});
