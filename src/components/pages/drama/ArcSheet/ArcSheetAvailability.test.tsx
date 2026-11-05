/* 全集一覽表：S1「即將上架」組、A2 逐集上架、LS2 快將下架、成套劇下架字（P8 #6） */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArcSummary } from '../../../../selectors/arcProgress';
import type { SeriesEpisode } from '../../../../types/drama';
import { ArcSheet } from './ArcSheet';
import type { ArcRowNotes } from './arcSheetTypes';

const ep = (arc: string, no: number): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'lancy',
    url: `/${arc}-${no}`,
    arc,
    no,
});

const HALF: ArcSummary = {
    arc: '戀愛二分一',
    total: 10,
    watched: 10,
    state: 'done',
    isNew: false,
    resume: ep('戀愛二分一', 1),
    resumeAt: 0,
};
const HEART: ArcSummary = { ...HALF, arc: '我心不死', total: 37, watched: 0, state: 'new' };

const NOTES: Record<string, ArcRowNotes> = {
    戀愛二分一: { total: 30, status: '聽到第 10 集', suffixes: ['第 11 集起 19/11 上架'] },
    我心不死: { suffixes: ['05/12 下架'], badge: '快將下架' },
};

const UPCOMING = [
    {
        arc: 'XXX',
        cover: '/xxx.webp',
        pill: '12/11',
        status: '12/11（四）上架 · 20 集',
        label: 'XXX，12/11（四）上架，未可以收聽',
    },
];

const renderSheet = (onPick = vi.fn()) =>
    render(
        <ArcSheet
            open
            groups={[{ group: 'unfinished', items: [HALF, HEART] }]}
            upcoming={UPCOMING}
            notesOf={(s) => NOTES[s.arc]}
            notice="成套劇 05/12（六）下架"
            current={undefined}
            isPlaying={false}
            onPick={onPick}
            onPlay={vi.fn()}
            onClose={vi.fn()}
            coverOf={(s) => `/${s.arc}.webp`}
        />,
    );

describe('ArcSheet availability', () => {
    it('should list upcoming arcs in a last group, not pressable, with no play button', async () => {
        const onPick = vi.fn();
        renderSheet(onPick);

        const groups = within(screen.getByRole('dialog')).getAllByRole('heading', { level: 3 });
        expect(groups.at(-1)).toHaveTextContent('即將上架');
        const row = screen.getByRole('button', { name: UPCOMING[0]?.label });
        expect(row).toHaveAttribute('aria-disabled', 'true');
        expect(row).toHaveTextContent('12/11（四）上架 · 20 集');
        expect(screen.queryByRole('button', { name: /播放 XXX|續聽 XXX/ })).not.toBeInTheDocument();
        await userEvent.click(row);
        expect(onPick).not.toHaveBeenCalled();
    });

    it('should count every episode in the pill and say when the next batch comes (A2)', () => {
        renderSheet();

        const row = screen.getByRole('button', { name: /^戀愛二分一，/ });
        expect(row).toHaveTextContent('10/30');
        expect(row).toHaveTextContent('聽到第 10 集 · 第 11 集起 19/11 上架');
        expect(row.querySelector('[data-role="done"]')).toBeNull();
    });

    it('should badge an arc leaving soon and add the day to its status (LS2)', () => {
        renderSheet();

        const row = screen.getByRole('button', { name: /^我心不死，/ });
        expect(row).toHaveTextContent('快將下架');
        expect(row).toHaveTextContent('未聽 · 37 集 · 05/12 下架');
        expect(row).toHaveAccessibleName('我心不死，未聽 · 37 集 · 05/12 下架，快將下架');
    });

    it('should note under the header when the whole drama leaves soon', () => {
        renderSheet();

        expect(
            within(screen.getByRole('dialog')).getByText('成套劇 05/12（六）下架'),
        ).toBeVisible();
    });
});
