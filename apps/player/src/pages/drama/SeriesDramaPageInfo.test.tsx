import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArcInfo, Drama } from '@903-player/catalog';
import { stubLandscape } from '../../../tests/landscape';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../../catalog/dramas';
import { saveProgress } from '../../services/progressStore';
import { DramaPage } from './DramaPage';

/** 示範資料：芝See 劇集簡介 + 「三十六計」聲演 / 簡介（真 catalog 未有） */
const ARC_WITH_INFO = '三十六計';
const ARC_INFO: Record<string, ArcInfo> = {
    [ARC_WITH_INFO]: { cast: ['聲演甲', '聲演乙'], summary: '短篇示範簡介' },
};
const info = vi.hoisted(() => ({ dramaSummary: '劇集示範簡介' as string | undefined }));

vi.mock('../../catalog/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas')>();
    const withSummary = (drama: Drama | undefined): Drama | undefined =>
        drama && info.dramaSummary !== undefined ? { ...drama, summary: info.dramaSummary } : drama;
    return {
        ...actual,
        findEnabledDrama: (id: string) => withSummary(actual.findEnabledDrama(id)),
        arcInfoFor: (id: string, arc: string) =>
            id === 'chisee' ? (ARC_INFO[arc] ?? {}) : undefined,
    };
});

const PATH = '/drama/:dramaId';
const openChisee = () => renderWithProviders(<DramaPage />, { route: '/drama/chisee', path: PATH });
const CHISEE = seriesEpisodesOf('chisee');
const arcSheet = () => screen.findByRole('dialog', { name: '全集' });

describe('SeriesDramaPage item info（P9.5 #12）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-13T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
        info.dramaSummary = '劇集示範簡介';
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should open the 全集 sheet expanded on a first visit', async () => {
        openChisee();
        const sheet = await arcSheet();
        const toggle = within(sheet).getByRole('button', { name: '劇集資料' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(within(sheet).getByText('劇集示範簡介')).toBeVisible();
        expect(within(sheet).getByRole('list', { name: '聲演' })).toHaveTextContent('聲演甲');
    });

    it('should open the 全集 sheet collapsed from the 全集 chip', async () => {
        saveProgress(CHISEE[0]?.id ?? '', 60, 1200);
        openChisee();
        await userEvent.click(screen.getByRole('button', { name: /^全集/ }));
        const sheet = await arcSheet();
        expect(within(sheet).getByRole('button', { name: '劇集資料' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('should open the 全集 sheet expanded from ⓘ while no arc is picked', async () => {
        openChisee();
        await userEvent.click(within(await arcSheet()).getByRole('button', { name: '關閉' }));
        await userEvent.click(screen.getByRole('button', { name: '劇集資料' }));
        const sheet = await arcSheet();
        expect(within(sheet).getByRole('button', { name: '劇集資料' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    it('should pop the arc info sheet when an unheard arc with info is picked', async () => {
        openChisee();
        const sheet = await arcSheet();
        await userEvent.click(within(sheet).getByRole('button', { name: /^三十六計，/ }));
        const dialog = await screen.findByRole('dialog', { name: '劇集資料' });
        const headings = within(dialog)
            .getAllByRole('heading')
            .map((h) => h.textContent);
        expect(headings).toEqual(['芝See菇Bi Family', ARC_WITH_INFO]);
        expect(within(dialog).getByText('短篇示範簡介')).toBeInTheDocument();
        // v3：劇集有簡介 = 劇集 banner + 細字（最新上架 / 短篇數），短篇段有碟面
        const banner = within(dialog).getByTestId('info-banner');
        expect(within(banner).getByRole('heading')).toHaveTextContent('芝See菇Bi Family');
        expect(banner).toHaveTextContent(/最新上架：|\d+ 個短篇/);
        const arcPart = within(dialog).getByRole('heading', { name: ARC_WITH_INFO });
        expect(arcPart.closest('section')?.querySelector('img')).not.toBeNull();
    });

    it('should not pop the info sheet for an arc without info', async () => {
        openChisee();
        const sheet = await arcSheet();
        await userEvent.click(within(sheet).getByRole('button', { name: /^大妒忌，/ }));
        expect(screen.queryByRole('dialog', { name: '劇集資料' })).not.toBeInTheDocument();
    });

    it('should open only the arc part from ⓘ once an arc is picked and the drama has no summary', async () => {
        info.dramaSummary = undefined;
        openChisee();
        await userEvent.click(
            within(await arcSheet()).getByRole('button', { name: /^三十六計，/ }),
        );
        await userEvent.click(
            within(await screen.findByRole('dialog', { name: '劇集資料' })).getByRole('button', {
                name: '關閉',
            }),
        );
        await userEvent.click(screen.getByRole('button', { name: '劇集資料' }));
        const dialog = await screen.findByRole('dialog', { name: '劇集資料' });
        expect(
            within(dialog)
                .getAllByRole('heading')
                .map((h) => h.textContent),
        ).toEqual([ARC_WITH_INFO]);
        // 劇集冇簡介：banner 改用短篇（大字短篇名、細字劇集名），下面唔再出短篇標題 / 碟面
        const banner = within(dialog).getByTestId('info-banner');
        expect(within(banner).getByRole('heading')).toHaveTextContent(ARC_WITH_INFO);
        expect(banner).toHaveTextContent('芝See菇Bi Family');
        expect(dialog.querySelectorAll('section[data-kind="arc"] img')).toHaveLength(0);
    });

    it('should dock the arc info sheet in the player column in landscape', async () => {
        stubLandscape();
        openChisee();
        await userEvent.click(
            within(await arcSheet()).getByRole('button', { name: /^三十六計，/ }),
        );
        const dialog = await screen.findByRole('dialog', { name: '劇集資料' });
        expect(dialog).toHaveAttribute('aria-modal', 'false');
        expect(dialog.closest('[data-player-gauge]')).toBeNull();
        expect(screen.queryByTestId('info-sheet-backdrop')).not.toBeInTheDocument();
    });
});

describe('SeriesDramaPage without item info', () => {
    beforeEach(() => {
        info.dramaSummary = undefined;
    });

    it('should show no ⓘ and no chevron when the drama has none', async () => {
        renderWithProviders(<DramaPage />, { route: '/drama/golden', path: PATH });
        const sheet = await arcSheet();
        expect(within(sheet).queryByRole('button', { name: '劇集資料' })).not.toBeInTheDocument();
        expect(screen.queryAllByRole('button', { name: '劇集資料', hidden: true })).toHaveLength(0);
    });
});
