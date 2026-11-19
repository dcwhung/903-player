import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Drama } from '@903-player/catalog';
import { stubViewport } from '../../../tests/landscape';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { dailyEpisodesOf } from '../../catalog/dramas';
import { saveProgress } from '../../services/progressStore';
import { DramaPage } from './DramaPage';

// 18 樓 C 座暫時停用：當佢開咗，再加示範簡介（有 ⓘ）
vi.mock('../../catalog/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas')>();
    const withSummary = (drama: Drama | undefined): Drama | undefined =>
        drama && { ...drama, summary: '每日劇示範簡介' };
    return { ...actual, findEnabledDrama: (id: string) => withSummary(actual.findDrama(id)) };
});

// HomeView 方形螢幕（SQUARE_QUERY）；390×844 = 現有手機直版
const SQUARE = { width: 544, height: 544 };
const PHONE = { width: 390, height: 844 };
const C18 = dailyEpisodesOf('c18');
const openC18 = (state?: { focusId: string | undefined }) =>
    renderWithProviders(<DramaPage />, { route: '/drama/c18', path: '/drama/:dramaId', state });
const LIST_BUTTON = /^集數清單，共 \d+ 集$/;

/** 有進度：唔會自動彈劇集資料（第一次入先彈） */
const withProgress = () => saveProgress(C18[0]?.id ?? '', 60, 600);

describe('DailyDramaPage HomeView（P10 lane 7b）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should put the list button and ⓘ in the header with no in-page episode list', async () => {
        stubViewport(SQUARE);
        withProgress();
        openC18();

        const button = await screen.findByRole('button', { name: LIST_BUTTON });
        const header = button.closest('header') as HTMLElement;
        expect(
            within(header)
                .getAllByRole('button')
                .map((b) => b.getAttribute('aria-label')),
        ).toEqual(['返回主頁', button.getAttribute('aria-label'), '劇集資料']);
        expect(screen.getAllByRole('button', { name: '劇集資料' })).toHaveLength(1);
        expect(screen.queryByRole('heading', { name: '集數' })).not.toBeInTheDocument();
        expect(document.querySelector('main')).toHaveAttribute('data-square-player');
    });

    it('should open the episode sheet from the list button with the badge count of rows', async () => {
        stubViewport(SQUARE);
        withProgress();
        openC18();

        const button = await screen.findByRole('button', { name: LIST_BUTTON });
        const count = within(button).getByText(/^\d+$/).textContent;
        await userEvent.click(button);

        const sheet = screen.getByRole('dialog', { name: '集數' });
        expect(sheet.querySelectorAll('li[data-episode-key]').length).toBeGreaterThanOrEqual(
            Number(count),
        );
    });

    it('should top the episode sheet with the drama banner and no fold-out summary', async () => {
        // v2.0.1 用戶反饋（2026-11-19）：跟節目頁清單 sheet 一樣，同資料 sheet 同一個 banner，冇箭咀、唔出簡介
        stubViewport(SQUARE);
        withProgress();
        openC18();

        await userEvent.click(await screen.findByRole('button', { name: LIST_BUTTON }));

        const sheet = screen.getByRole('dialog', { name: '集數' });
        expect(within(sheet).getByTestId('info-banner')).toBeInTheDocument();
        expect(sheet).toHaveAttribute('data-banner-size', 'info');
        expect(within(sheet).queryByRole('button', { name: '劇集資料' })).not.toBeInTheDocument();
        expect(within(sheet).queryByText('每日劇示範簡介')).not.toBeInTheDocument();
    });

    it('should auto-open the episode sheet when entered from 我的收藏 and return focus after Escape', async () => {
        stubViewport(SQUARE);
        openC18({ focusId: C18[0]?.id });

        await screen.findByRole('dialog', { name: '集數' });
        await act(async () => {});
        await userEvent.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: '集數' })).not.toBeInTheDocument(),
        );
        expect(screen.getByRole('button', { name: LIST_BUTTON })).toHaveFocus();
    });

    it('should return focus to the header ⓘ after the first-visit drama info closes', async () => {
        stubViewport(SQUARE);
        openC18();

        await screen.findByRole('dialog', { name: '劇集資料' });
        await userEvent.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: '劇集資料' })).not.toBeInTheDocument(),
        );
        const info = screen.getByRole('button', { name: '劇集資料' });
        expect(info.closest('header')).not.toBeNull();
        expect(info).toHaveFocus();
    });

    it('should keep the episode list on the page on a phone', async () => {
        stubViewport(PHONE);
        withProgress();
        openC18();

        expect(await screen.findByRole('heading', { name: '集數' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: LIST_BUTTON })).not.toBeInTheDocument();
    });
});
