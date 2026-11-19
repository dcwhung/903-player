import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { arcLabelOf } from '@903-player/catalog';
import { stubViewport } from '../../../tests/landscape';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../../catalog/dramas';
import { episodesInArc } from '../../selectors/dramas';
import { DramaPage } from './DramaPage';

// HomeView 方形螢幕（SQUARE_QUERY）；390×844 = 現有手機直版
const SQUARE = { width: 544, height: 544 };
const PHONE = { width: 390, height: 844 };
const PATH = '/drama/:dramaId';
const CHISEE = seriesEpisodesOf('chisee');
const FIRST = CHISEE[0];
const ARC = FIRST ? arcLabelOf(FIRST) : '';
const ARC_COUNT = new Set(CHISEE.map((e) => e.arc)).size;
const ARC_EPISODES = FIRST ? episodesInArc(CHISEE, FIRST.arc).length : 0;
const ALL_BUTTON = `全集，共 ${ARC_COUNT} 個短篇`;
const ARC_BUTTON = `${ARC}集數清單，共 ${ARC_EPISODES} 集`;
// W-796：第二個短篇（播緊 A 時喺全集表揀 B）
const OTHER = CHISEE.find((e) => e.arc !== FIRST?.arc);
const OTHER_ARC = OTHER ? arcLabelOf(OTHER) : '';
const OTHER_EPISODES = OTHER ? episodesInArc(CHISEE, OTHER.arc).length : 0;
const OTHER_BUTTON = `${OTHER_ARC}集數清單，共 ${OTHER_EPISODES} 集`;

const openChisee = () => renderWithProviders(<DramaPage />, { route: '/drama/chisee', path: PATH });
const allSheet = () => screen.findByRole('dialog', { name: '全集' });
const headerOf = (el: HTMLElement) => el.closest('header') as HTMLElement;
/** 唱片下面嗰組字（全集 / 短篇名 + 集名） */
const titleBlock = () => document.querySelector('[data-series-title]') as HTMLElement;

/** 第一次入自動開嘅全集表：撳第一個短篇嗰行（揀短篇，唔播） */
const pickArcRow = async (arc: string) => {
    const sheet = await allSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: new RegExp(`^${arc}，`) }));
};
const pickFirstArc = () => pickArcRow(ARC);
const arcSheet = () => screen.getByRole('dialog', { name: '集數' });
const bannerTitle = () =>
    within(within(arcSheet()).getByTestId('info-banner')).getByRole('heading');

/** 揀第一個短篇（開咗佢嘅短篇表）→ 閂表 → 撳播放，播緊 A */
const playFirstArc = async () => {
    const rendered = openChisee();
    await pickFirstArc();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: '播放' }));
    act(() => rendered.audio.emitPlaying());
    act(() => rendered.audio.emitMetadata(1200));
    return rendered;
};

/** 播緊 A：清單掣（短篇表）→「全集」→ 全集表撳 B 行 */
const pickOtherArcWhilePlaying = async () => {
    await userEvent.click(screen.getByRole('button', { name: ARC_BUTTON }));
    await userEvent.click(within(arcSheet()).getByRole('button', { name: '全集' }));
    await pickArcRow(OTHER_ARC);
};

describe('SeriesDramaPage HomeView（P10 lane 7b）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-13T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('should show 全集 with an arc-count badge and no in-page picker or list before an arc is picked', async () => {
        stubViewport(SQUARE);
        openChisee();

        await allSheet();
        const button = screen.getByRole('button', { name: ALL_BUTTON });
        expect(within(headerOf(button)).getByText(String(ARC_COUNT))).toBeInTheDocument();
        expect(button).toHaveAttribute('aria-expanded', 'true');
        const main = document.querySelector('main') as HTMLElement;
        expect(main).toHaveAttribute('data-square-player');
        expect(within(titleBlock()).getByText('全集')).toBeInTheDocument();
        expect(within(titleBlock()).getByText('揀一個短篇開始收聽')).toBeInTheDocument();
        expect(within(main).queryByRole('heading', { name: '集數' })).not.toBeInTheDocument();
        expect(within(main).queryByRole('button', { name: /^全集/ })).toBe(button);
    });

    it('should return focus to the list button after a keyboard close of the first-visit 全集 sheet', async () => {
        stubViewport(SQUARE);
        openChisee();

        await allSheet();
        await userEvent.keyboard('{Escape}');

        expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: ALL_BUTTON })).toHaveFocus();
    });

    it('should toggle the 全集 sheet from the list button before an arc is picked', async () => {
        stubViewport(SQUARE);
        openChisee();
        await userEvent.keyboard('{Escape}');

        await userEvent.click(screen.getByRole('button', { name: ALL_BUTTON }));

        expect(await allSheet()).toBeInTheDocument();
    });

    it('should show the arc and episode with an episode-count badge once an arc is picked', async () => {
        stubViewport(SQUARE);
        openChisee();

        await pickFirstArc();

        const button = await screen.findByRole('button', { name: ARC_BUTTON });
        expect(within(headerOf(button)).getByText(String(ARC_EPISODES))).toBeInTheDocument();
        expect(within(titleBlock()).getByText(ARC)).toBeInTheDocument();
        expect(
            within(titleBlock()).getAllByText(new RegExp(`^第 ${FIRST?.no} 集`))[0],
        ).toBeInTheDocument();
        expect(within(titleBlock()).queryByText('揀一個短篇開始收聽')).not.toBeInTheDocument();
    });

    it('should open the arc sheet with the banner and that arc’s episodes', async () => {
        stubViewport(SQUARE);
        openChisee();
        await pickFirstArc();
        await userEvent.keyboard('{Escape}');

        await userEvent.click(await screen.findByRole('button', { name: ARC_BUTTON }));

        const sheet = screen.getByRole('dialog', { name: '集數' });
        const banner = within(sheet).getByTestId('info-banner');
        expect(within(banner).getByRole('heading')).toHaveTextContent(ARC);
        expect(within(banner).getByText(/芝See菇Bi Family/)).toBeInTheDocument();
        expect(sheet.querySelectorAll('li[data-episode-key]')).toHaveLength(ARC_EPISODES);
        expect(within(sheet).getByRole('button', { name: '全集' })).toBeInTheDocument();
    });

    it('should switch from the arc sheet to the 全集 sheet with the 全集 button', async () => {
        stubViewport(SQUARE);
        openChisee();
        await pickFirstArc();

        const sheet = screen.getByRole('dialog', { name: '集數' });
        await userEvent.click(within(sheet).getByRole('button', { name: '全集' }));

        expect(await allSheet()).toBeInTheDocument();
        expect(screen.queryByRole('dialog', { name: '集數' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: ARC_BUTTON })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    it('should open the picked arc’s sheet with focus inside when an arc is picked before anything plays', async () => {
        stubViewport(SQUARE);
        openChisee();

        await pickFirstArc();

        expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
        expect(bannerTitle()).toHaveTextContent(ARC);
        expect(arcSheet()).toContainElement(document.activeElement as HTMLElement);
        expect(screen.getByRole('button', { name: ARC_BUTTON })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    it('should switch to the picked arc’s sheet when another arc is picked while one plays', async () => {
        stubViewport(SQUARE);
        const { audio } = await playFirstArc();

        await pickOtherArcWhilePlaying();

        expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
        expect(bannerTitle()).toHaveTextContent(OTHER_ARC);
        expect(arcSheet().querySelectorAll('li[data-episode-key]')).toHaveLength(OTHER_EPISODES);
        expect(arcSheet()).toContainElement(document.activeElement as HTMLElement);
        expect(screen.getByRole('button', { name: OTHER_BUTTON })).toBeInTheDocument();
        expect(audio.src).toBe(FIRST?.url);
    });

    it('should revert the list button and arc sheet to the playing arc when the picked arc’s sheet closes without playing', async () => {
        stubViewport(SQUARE);
        const { audio } = await playFirstArc();
        await pickOtherArcWhilePlaying();

        await userEvent.keyboard('{Escape}');

        const button = screen.getByRole('button', { name: ARC_BUTTON });
        expect(button).toHaveFocus();
        expect(within(headerOf(button)).getByText(String(ARC_EPISODES))).toBeInTheDocument();
        expect(within(titleBlock()).getByText(ARC)).toBeInTheDocument();
        expect(audio.src).toBe(FIRST?.url);
        await userEvent.click(button);
        expect(bannerTitle()).toHaveTextContent(ARC);
    });

    it('should revert to the playing arc when the 全集 sheet reached from the picked arc’s sheet closes', async () => {
        stubViewport(SQUARE);
        await playFirstArc();
        await pickOtherArcWhilePlaying();

        await userEvent.click(within(arcSheet()).getByRole('button', { name: '全集' }));
        await userEvent.keyboard('{Escape}');

        expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: ARC_BUTTON })).toHaveFocus();
    });

    it('should show the picked arc on the page once one of its episodes plays from its sheet', async () => {
        stubViewport(SQUARE);
        const { audio } = await playFirstArc();
        await pickOtherArcWhilePlaying();

        const row = arcSheet().querySelector('li[data-episode-key] button') as HTMLElement;
        await userEvent.click(row);
        await waitFor(() => expect(audio.src).toBe(OTHER?.url));
        act(() => audio.emitPlaying());
        await userEvent.keyboard('{Escape}');

        expect(screen.getByRole('button', { name: OTHER_BUTTON })).toBeInTheDocument();
        expect(within(titleBlock()).getByText(OTHER_ARC)).toBeInTheDocument();
    });

    it('should open the arc sheet instead of the 全集 sheet when entered from 我的收藏', async () => {
        stubViewport(SQUARE);
        renderWithProviders(<DramaPage />, {
            route: '/drama/chisee',
            path: PATH,
            state: { focusId: CHISEE[1]?.id },
        });

        const sheet = await screen.findByRole('dialog', { name: '集數' });
        expect(within(sheet).getByTestId('info-banner')).toHaveTextContent(ARC);
        expect(screen.queryByRole('dialog', { name: '全集' })).not.toBeInTheDocument();
    });

    it('should keep the arc chips and episode list on the page on a phone', async () => {
        stubViewport(PHONE);
        openChisee();

        await allSheet();
        expect(screen.queryByRole('button', { name: ALL_BUTTON })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '集數' })).toBeInTheDocument();
    });
});
