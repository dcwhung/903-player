import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FlowBar } from './FlowBar';
import { SaveBar } from './SaveBar';

describe('FlowBar', () => {
    it('should list what is still missing and link back to the todos', () => {
        render(
            <MemoryRouter>
                <FlowBar name="蘭茜夫人劇場 › 我心不死" missing={['排期', 'ID']} />
            </MemoryRouter>,
        );
        expect(screen.getByRole('region', { name: '處理待辦' })).toHaveTextContent(
            '蘭茜夫人劇場 › 我心不死 · 尚欠：排期、ID',
        );
        expect(screen.getByRole('link', { name: '← 返回待辦' })).toHaveAttribute('href', '/');
    });
});

describe('SaveBar', () => {
    it('should read 儲存並返回待辦 when opened from the todos', () => {
        render(<SaveBar dirtyFields={['簡介']} fromTodos saving={false} onSave={() => {}} />);
        expect(screen.getByRole('button', { name: '儲存並返回待辦' })).toBeEnabled();
        expect(screen.getByRole('status')).toHaveTextContent('● 有未儲存的變更（簡介）');
    });

    it('should read 儲存, disabled and without the dirty note when nothing changed', () => {
        render(<SaveBar dirtyFields={[]} fromTodos={false} saving={false} onSave={() => {}} />);
        expect(screen.getByRole('button', { name: '儲存' })).toBeDisabled();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
