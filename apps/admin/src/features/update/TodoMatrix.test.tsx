import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
});
