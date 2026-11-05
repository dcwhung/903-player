/* 集數清單：未上架批次摺埋一行（撳唔到）、快將下架 LE1（P8 #6，_mockups_/coming-soon ⑥ ⑧） */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EpisodeList } from './EpisodeList';
import type { EpisodeItem } from './episodeListTypes';

const row = (no: number, extra: Partial<EpisodeItem> = {}): EpisodeItem => ({
    key: `/half/${no}`,
    dayMonth: `第 ${no} 集`,
    weekday: '',
    current: false,
    isPlaying: false,
    status: { kind: 'unwatched', ratio: 0, text: '未收聽' },
    ...extra,
});

const BATCH: EpisodeItem = {
    key: 'batch:11',
    dayMonth: '第 11–20 集',
    weekday: '',
    current: false,
    isPlaying: false,
    status: { kind: 'upcoming', ratio: 0, text: '19/11（四）上架' },
    episodeCount: 10,
    label: '第 11 至 20 集，19/11（四）上架，未可以收聽',
};

describe('EpisodeList availability', () => {
    beforeEach(() => {
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });

    it('should fold a batch not out yet into one row that cannot be pressed', async () => {
        const onSelect = vi.fn();
        render(<EpisodeList items={[row(1), BATCH]} onSelect={onSelect} labels="title" />);

        const batch = screen.getByRole('button', { name: BATCH.label });
        expect(batch).toHaveAttribute('aria-disabled', 'true');
        expect(batch).toHaveTextContent('第 11–20 集');
        expect(batch).toHaveTextContent('19/11（四）上架');
        await userEvent.click(batch);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('should still count every episode, including the folded ones', () => {
        render(<EpisodeList items={[row(1), BATCH]} onSelect={vi.fn()} labels="title" />);

        expect(screen.getByText('共 11 集')).toBeInTheDocument();
    });

    it('should add the amber leaving day after the status (LE1)', () => {
        const leaving = { text: '05/12 下架', label: '05/12（六）下架' };
        render(<EpisodeList items={[row(1, { leaving })]} onSelect={vi.fn()} labels="title" />);

        const button = screen.getByRole('button', { name: /^播放 第 1 集/ });
        expect(button).toHaveTextContent('未收聽05/12 下架');
        expect(button).toHaveAccessibleName(/05\/12（六）下架/);
    });
});
