import { render, screen } from '@testing-library/react';
import type { ChangeItem } from '@903-player/catalog';
import type { ChangesResponse, PublishSelection, TodoRow } from '../../api/types';
import { SelectionCard } from './SelectionCard';

const NA = { state: 'na' } as const;
const DONE = { state: 'done' } as const;
const row = (over: Partial<TodoRow>): TodoRow => ({
    key: 'newArc/lancy/love-after',
    publish: 'selectable',
    kind: 'newArc',
    findingIds: [1],
    dramaId: 'lancy',
    arcId: 'love-after',
    name: '蘭茜夫人劇場 · 戀愛後二分一',
    cells: { folder: DONE, id: DONE, images: DONE, schedule: DONE, summary: NA },
    ...over,
});
const CAMP = row({
    key: 'newArc/sammy/camp',
    publish: 'incomplete',
    dramaId: 'sammy',
    arcId: 'camp',
    name: '森美小儀系列 · 大衛營',
    cells: {
        folder: DONE,
        id: DONE,
        images: DONE,
        schedule: { state: 'must', target: '/dramas/sammy/schedule#camp' },
        summary: NA,
    },
});
const EDIT = {
    kind: 'edit',
    when: 'now',
    entry: { kind: 'shows', id: 'waves', name: '口水多過浪花' },
    detail: { fields: ['summary'] },
} as ChangeItem;

const NOTHING: PublishSelection = {
    content: ['newArc/lancy/love-after'],
    branding: { icon: false, text: false },
    banner: false,
};
const TEXT: PublishSelection = { ...NOTHING, branding: { icon: false, text: true } };

const data = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [EDIT], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    appearance: { icon: false, text: true, banner: false },
    others: { items: [EDIT], timeline: [] },
    selection: { content: NOTHING.content, skipped: [] },
    ...over,
});

const show = (props: { data: ChangesResponse; selection: PublishSelection; rows?: TodoRow[] }) =>
    render(<SelectionCard {...props} rows={[row({}), ...(props.rows ?? [])]} />);

describe('SelectionCard (本次發佈)', () => {
    it('should keep App 外觀 chips and both notes, without listing content (the timeline does)', () => {
        show({ data: data({ brandingChanged: true }), selection: TEXT, rows: [CAMP] });
        const card = screen.getByRole('region', { name: '本次發佈' });
        expect(screen.getByText('App 外觀 · 名稱與簡介')).toHaveClass('pub-look');
        expect(card).toHaveTextContent(
            '以下項目尚未完成，不會在本次發佈：森美小儀系列 › 大衛營（尚未設定排期）。',
        );
        expect(card).toHaveTextContent(/圖示、名稱及簡介須重新部署播放器/);
        expect(card).not.toHaveTextContent('戀愛後二分一');
        expect(card).not.toHaveTextContent('口水多過浪花');
        expect(card).not.toHaveTextContent('其他已儲存的改動');
    });

    it('should list a skipped pick as incomplete', () => {
        const skipped = [{ key: 'newArc/lancy/love-after', reason: 'incomplete' as const }];
        show({ data: data({ selection: { content: [], skipped } }), selection: NOTHING });
        expect(screen.getByRole('region', { name: '本次發佈' })).toHaveTextContent(
            '以下項目尚未完成',
        );
    });

    it('should hide the card when there is no App 外觀 and no note', () => {
        const { container } = show({ data: data(), selection: NOTHING });
        expect(screen.queryByRole('region', { name: '本次發佈' })).not.toBeInTheDocument();
        expect(container).toBeEmptyDOMElement();
    });

    it('should not list App 外觀 the server says this selection leaves unchanged', () => {
        show({ data: data({ brandingChanged: false }), selection: TEXT, rows: [CAMP] });
        expect(screen.queryByText(/App 外觀 ·/)).not.toBeInTheDocument();
    });
});
