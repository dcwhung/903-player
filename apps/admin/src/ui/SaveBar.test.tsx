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
});
