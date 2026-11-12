import { render, screen } from '@testing-library/react';
import { SaveBar } from './SaveBar';

describe('SaveBar', () => {
    it('should put the dirty note inside the actions right before the save button', () => {
        render(
            <SaveBar
                dirtyFields={['簡介']}
                fromTodos={false}
                saving={false}
                onSave={vi.fn()}
                start={<span>left</span>}
            />,
        );
        const note = screen.getByText('● 有未儲存的變更（簡介）');
        const save = screen.getByRole('button', { name: '儲存' });
        expect(note.parentElement).toBe(save.parentElement);
        expect(note.nextElementSibling).toBe(save);
    });

    it('should put 復原 at the far left, away from the dirty note and the save button', () => {
        const { container } = render(
            <SaveBar
                dirtyFields={['簡介']}
                fromTodos={true}
                saving={false}
                onSave={vi.fn()}
                onRevert={vi.fn()}
                start={<button type="button">刪除</button>}
            />,
        );
        const [left, right] = Array.from(container.querySelectorAll('.savebar > .actions'));
        const revert = screen.getByRole('button', { name: '復原' });
        expect(left?.firstElementChild).toBe(revert);
        expect(right).not.toContainElement(revert);
        expect(right).toContainElement(screen.getByText('● 有未儲存的變更（簡介）'));
        expect(right?.lastElementChild).toBe(
            screen.getByRole('button', { name: '儲存並返回待辦' }),
        );
    });
});
