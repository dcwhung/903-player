import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SeriesEpisode } from '@903-player/catalog';
import type { ArcSummary } from '../../../../selectors/arcProgress';
import type { InlineInfo } from '../../../../selectors/itemInfo';
import { ArcSheet } from './ArcSheet';

const ep = (arc: string): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'lancy',
    id: `drama:lancy:${arc}:1`,
    url: `/${arc}-1.m4a`,
    arc,
    no: 1,
});

const summary = (arc: string): ArcSummary => ({
    arc,
    total: 3,
    watched: 0,
    state: 'new',
    isNew: false,
    resume: ep(arc),
    resumeAt: 0,
});

const INFO: Record<string, InlineInfo> = {
    戀愛二分一: { cast: ['聲演甲', '聲演乙'], summary: '短篇簡介' },
};

const renderSheet = (info?: Parameters<typeof ArcSheet>[0]['info']) =>
    render(
        <ArcSheet
            open
            groups={[{ group: 'unfinished', items: [summary('戀愛二分一'), summary('我心不死')] }]}
            current={undefined}
            isPlaying={false}
            onPick={vi.fn()}
            onPlay={vi.fn()}
            onClose={vi.fn()}
            coverOf={() => '/cover.webp'}
            info={info}
        />,
    );

const infoOf = (expanded: boolean, onToggle = vi.fn()) => ({
    expanded,
    onToggle,
    dramaSummary: '劇集簡介',
    arcInfoOf: (s: ArcSummary) => INFO[s.arc] ?? {},
});

describe('ArcSheet item info（P9.5 #12）', () => {
    it('should have no chevron when the drama has no info', () => {
        renderSheet();
        expect(screen.queryByRole('button', { name: '劇集資料' })).not.toBeInTheDocument();
    });

    it('should show a collapsed chevron beside 全集 with the info out of reach', () => {
        renderSheet(infoOf(false));
        const toggle = screen.getByRole('button', { name: '劇集資料' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('list', { name: '聲演' })).not.toBeInTheDocument();
    });

    it('should call onToggle when the chevron is pressed', async () => {
        const onToggle = vi.fn();
        renderSheet(infoOf(false, onToggle));
        await userEvent.click(screen.getByRole('button', { name: '劇集資料' }));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should show the drama summary and each arc cast and summary when expanded', () => {
        renderSheet(infoOf(true));
        expect(screen.getByText('劇集簡介')).toBeInTheDocument();
        const row = screen.getByRole('list', { name: '聲演' }).closest('li') as HTMLElement;
        expect(within(row).getByText('短篇簡介')).toBeInTheDocument();
        expect(within(row).getByRole('button', { name: /^戀愛二分一，/ })).toBeInTheDocument();
    });

    it('should give a row without info no info area', () => {
        const { container } = renderSheet(infoOf(true));
        expect(container.ownerDocument.querySelectorAll('[data-role="item-info"]')).toHaveLength(1);
    });
});
