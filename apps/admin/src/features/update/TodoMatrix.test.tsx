import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { TodoRow } from '../../api/types';
import { TodoMatrix } from './TodoMatrix';

const NA = { state: 'na' } as const;
const ROWS: TodoRow[] = [
    {
        key: 'newDrama/drama-01',
        publish: 'incomplete',
        kind: 'newDrama',
        findingIds: [1],
        dramaId: 'drama-01',
        arcId: null,
        name: '天使之戀系列',
        cells: {
            folder: { state: 'done', target: '/dramas/drama-01#folder' },
            id: { state: 'must', target: '/dramas/drama-01' },
            images: { state: 'must', target: '/dramas/drama-01#images' },
            schedule: { state: 'must', target: '/dramas/drama-01/schedule' },
            summary: { state: 'optional', target: '/dramas/drama-01' },
        },
    },
    {
        key: 'missingFolder/jim',
        publish: 'always',
        kind: 'missingFolder',
        findingIds: [2],
        dramaId: 'jim',
        arcId: null,
        name: '少爺占系列',
        cells: {
            folder: { state: 'must', target: '/dramas/jim#folder' },
            id: NA,
            images: NA,
            schedule: NA,
            summary: NA,
        },
    },
    {
        key: 'newArc/lancy/love-after',
        publish: 'selectable',
        kind: 'newArc',
        findingIds: [3],
        dramaId: 'lancy',
        arcId: 'love-after',
        name: '蘭茜夫人劇場 · 戀愛後二分一',
        cells: {
            folder: { state: 'done', target: '/dramas/lancy#folder' },
            id: { state: 'done', target: '/dramas/lancy/arcs#love-after' },
            images: { state: 'done', target: '/dramas/lancy/arcs#love-after' },
            schedule: { state: 'done', target: '/dramas/lancy/schedule#love-after' },
            summary: { state: 'done', target: '/dramas/lancy/arcs#love-after' },
        },
    },
    {
        key: 'newEpisodes/golden/s1',
        publish: 'always',
        kind: 'newEpisodes',
        findingIds: [4],
        dramaId: 'golden',
        arcId: 's1',
        name: '黃金少年 · Season 1',
        cells: {
            folder: { state: 'done', target: '/dramas/golden#folder' },
            id: NA,
            images: NA,
            schedule: NA,
            summary: NA,
        },
    },
];

const NONE: ReadonlySet<string> = new Set();
const matrix = (unpicked = NONE, onToggle = vi.fn()) => (
    <TodoMatrix rows={ROWS} entries={[]} unpicked={unpicked} onToggle={onToggle} />
);

describe('TodoMatrix', () => {
    it('should put the 發佈 column last with a ticked box for a selectable row (Q1)', () => {
        render(<MemoryRouter>{matrix()}</MemoryRouter>);
        const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
        expect(headers.at(-1)).toBe('發佈');
        expect(screen.getByRole('checkbox', { name: '發佈戀愛後二分一' })).toBeChecked();
    });

    it('should show 未完成 without a checkbox for an incomplete row, missing settings in the tooltip', () => {
        render(<MemoryRouter>{matrix()}</MemoryRouter>);
        const row = screen.getByRole('row', { name: /天使之戀系列/ });
        expect(within(row).queryByRole('checkbox')).not.toBeInTheDocument();
        const cell = within(row).getByTitle('天使之戀系列（尚未設定ID、圖片、排期）');
        // S-989：screen reader 讀到「未完成：…（尚未設定…）」
        expect(cell).toHaveTextContent('未完成：天使之戀系列（尚未設定ID、圖片、排期）');
    });

    it('should only show a checkbox on selectable rows', () => {
        render(<MemoryRouter>{matrix()}</MemoryRouter>);
        expect(screen.getAllByRole('checkbox')).toHaveLength(1);
        expect(screen.getByRole('row', { name: /Season 1/ })).toHaveTextContent('一併發佈');
    });

    it('should untick an unpicked row and report toggles without opening the row', async () => {
        const onToggle = vi.fn();
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route
                        path="/"
                        element={matrix(new Set(['newArc/lancy/love-after']), onToggle)}
                    />
                    <Route path="*" element={<p>other page</p>} />
                </Routes>
            </MemoryRouter>,
        );
        const box = screen.getByRole('checkbox', { name: '發佈戀愛後二分一' });
        expect(box).not.toBeChecked();
        await userEvent.click(box);
        expect(onToggle).toHaveBeenCalledWith('newArc/lancy/love-after');
        expect(screen.queryByText('other page')).not.toBeInTheDocument();
    });

    it('should render must / optional / done / na cells with deep links', () => {
        render(<MemoryRouter>{matrix()}</MemoryRouter>);
        expect(screen.getByRole('link', { name: '天使之戀系列：ID' })).toHaveAttribute(
            'href',
            '/dramas/drama-01?from=todos&todo=newDrama%3Adrama-01%3A',
        );
        expect(screen.getByRole('link', { name: '天使之戀系列：排期' })).toHaveTextContent('設定');
        expect(screen.getByRole('link', { name: '（選填）天使之戀系列：簡介' })).toHaveClass(
            'cell',
        );
        expect(screen.getByLabelText('天使之戀系列：資料夾 已完成')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '少爺占系列：資料夾' })).toHaveTextContent('配對');
        expect(screen.getByLabelText('少爺占系列：ID 不適用')).toBeInTheDocument();
        expect(screen.getByRole('row', { name: /少爺占系列/ })).toHaveClass('attn');
    });

    describe('row click', () => {
        function Where() {
            const location = useLocation();
            return <output>{`${location.pathname}${location.search}${location.hash}`}</output>;
        }

        const renderRoutes = () =>
            render(
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={matrix()} />
                        <Route path="*" element={<Where />} />
                    </Routes>
                </MemoryRouter>,
            );

        it('should open the content editor (from todos) when the row background is clicked', async () => {
            renderRoutes();
            const row = screen.getByRole('row', { name: /天使之戀系列/ });
            expect(row).toHaveClass('clickable');
            await userEvent.click(row.querySelector('td.ok') as Element);
            expect(screen.getByRole('status')).toHaveTextContent(
                '/dramas/drama-01?from=todos&todo=newDrama%3Adrama-01%3A',
            );
        });

        it('should go to the missing folder pairing for a missing-folder row', async () => {
            renderRoutes();
            await userEvent.click(screen.getByLabelText('少爺占系列：ID 不適用'));
            expect(screen.getByRole('status')).toHaveTextContent(
                '/dramas/jim?from=todos&todo=missingFolder%3Ajim%3A#folder',
            );
        });

        it('should let a cell button keep its own target', async () => {
            renderRoutes();
            await userEvent.click(screen.getByRole('link', { name: '天使之戀系列：排期' }));
            expect(screen.getByRole('status')).toHaveTextContent(
                '/dramas/drama-01/schedule?from=todos',
            );
        });

        it('should reach the row target from the keyboard via the title link', async () => {
            renderRoutes();
            const title = screen.getByRole('link', { name: '天使之戀系列' });
            title.focus();
            await userEvent.keyboard('{Enter}');
            expect(screen.getByRole('status')).toHaveTextContent('/dramas/drama-01?from=todos');
        });
    });
});
