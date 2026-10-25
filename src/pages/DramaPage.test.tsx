import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubLandscape } from '../../tests/landscape';
import { renderWithProviders } from '../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../data/dramaCatalog';
import { saveProgress } from '../services/progressStore';
import { DramaPage } from './DramaPage';

const PATH = '/drama/:dramaId';
const CHISEE = seriesEpisodesOf('chisee');
const XMAS = CHISEE.filter((e) => e.arc === 'Ｘ時mas時小提議');

const openDrama = (id: string) =>
    renderWithProviders(<DramaPage />, { route: `/drama/${id}`, path: PATH });
const arcChips = () => within(screen.getByRole('group', { name: '短篇' })).getAllByRole('button');

describe('DramaPage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 香港 23/10（五）16:00
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    describe('series drama', () => {
        it('spins the disc of the playing season, not the one only being browsed', async () => {
            const s2 = seriesEpisodesOf('golden').filter((e) => e.arc === 'Season 2');
            saveProgress(s2[2]?.url ?? '', 60, 1200);
            const { audio } = openDrama('golden');
            const discArt = () => screen.getByRole('main').querySelector('img');

            await waitFor(() => expect(audio.src).toBe(s2[2]?.url));
            expect(discArt()?.getAttribute('src')).toContain('golden-s2-disc');

            await userEvent.click(screen.getByRole('button', { name: /^Season 4/ }));
            expect(discArt()?.getAttribute('src')).toContain('golden-s2-disc');
        });

        it('autoplays the first episode on a light themed page with the drama name as title', async () => {
            const { audio } = openDrama('chisee');

            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            expect(audio.play).toHaveBeenCalled();
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('芝See菇Bi Family');
            expect(screen.getByRole('main').closest('[data-theme-scope]')).toHaveAttribute(
                'data-scheme',
                'light',
            );
        });

        it('resumes the last episode and lists only its arc, with the arc chip pressed', async () => {
            saveProgress(XMAS[1]?.url ?? '', 120, 1200);
            const { audio } = openDrama('chisee');

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
            expect(screen.getByText('現正播放：第 2 集 哥哥你洽我')).toBeInTheDocument();
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
            const { audio } = openDrama('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));

            await userEvent.click(screen.getByRole('button', { name: 'Ｘ時mas時小提議' }));

            expect(audio.src).toBe(CHISEE[0]?.url);
            const list = screen.getByRole('region', { name: '集數' });
            expect(within(list).getAllByRole('button')).toHaveLength(4);
            await userEvent.click(within(list).getByRole('button', { name: /索腳汗/ }));
            await waitFor(() => expect(audio.src).toBe(XMAS[2]?.url));
        });
    });

    describe('landscape', () => {
        beforeEach(stubLandscape);
        afterEach(() => vi.unstubAllGlobals());

        it('counts a 第零集 短篇 by position, so its last episode reads 第 26 / 26 集', async () => {
            const chuluen = CHISEE.filter((e) => e.arc === '初戀嗱喳麵');
            saveProgress(chuluen.at(-1)?.url ?? '', 120, 1200);
            const { audio } = openDrama('chisee');
            await waitFor(() => expect(audio.src).toBe(chuluen.at(-1)?.url));
            act(() => audio.emitMetadata(1200));

            expect(screen.getByText('現正播放：初戀嗱喳麵 · 第 26 / 26 集')).toBeInTheDocument();
        });

        it('shows the 短篇, position and episode title under the disc, header above the list', async () => {
            saveProgress(XMAS[1]?.url ?? '', 120, 1200);
            const { audio } = openDrama('chisee');
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
            const { audio } = openDrama('chisee');
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
        const { audio } = openDrama('chisee');
        await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
        act(() => audio.emitMetadata(1200));

        act(() => audio.end());

        await waitFor(() => expect(audio.src).toBe(CHISEE[1]?.url));
        const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole('button');
        // 播緊第 2 集排頂；聽完嘅第 1 集排最底
        expect(rows[0]).toHaveAttribute('aria-current', 'true');
        expect(rows.at(-1)).toHaveAccessibleName(`播放 ${CHISEE[0]?.title ?? ''} 第 1 集，已收聽`);
    });

    describe('全集 overview', () => {
        const BIRTHDAY = CHISEE.filter((e) => e.arc === '你生日所以我生日');
        const FRIENDS = CHISEE.filter((e) => e.arc === '好朋友手牽手');

        it('groups 短篇 playing → unfinished → finished, and plays one from its row button', async () => {
            BIRTHDAY.forEach((e) => saveProgress(e.url, 990, 1000));
            saveProgress(FRIENDS[0]?.url ?? '', 990, 1000);
            vi.setSystemTime(new Date('2026-10-23T08:05:00Z')); // 最近聽緊嘅係好朋友手牽手第 2 集
            saveProgress(FRIENDS[1]?.url ?? '', 400, 1000);
            const { audio } = openDrama('chisee');
            await waitFor(() => expect(audio.src).toBe(FRIENDS[1]?.url));

            await userEvent.click(screen.getByRole('button', { name: '全集' }));

            const dialog = screen.getByRole('dialog', { name: '全集' });
            const picks = within(dialog)
                .getAllByRole('button')
                .filter((b) => b.dataset.role === 'pick');
            expect(picks).toHaveLength(12);
            expect(picks[0]).toHaveAccessibleName('好朋友手牽手，播緊第 2 集');
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

        it('moves the playing 短篇 to the front of the chips, after 全集', async () => {
            const { audio } = openDrama('chisee');
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
            const { audio } = openDrama('chisee');
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
