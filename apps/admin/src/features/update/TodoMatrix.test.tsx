import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { TodoRow } from '../../api/types';
import { TodoMatrix } from './TodoMatrix';

const NA = { state: 'na' } as const;
const ROWS: TodoRow[] = [
    {
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
];

describe('TodoMatrix', () => {
    it('should render must / optional / done / na cells with deep links', () => {
        render(
            <MemoryRouter>
                <TodoMatrix rows={ROWS} entries={[]} />
            </MemoryRouter>,
        );
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
                        <Route path="/" element={<TodoMatrix rows={ROWS} entries={[]} />} />
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
