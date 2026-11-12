import { render, screen } from '@testing-library/react';
import { hasIcon } from '../../../tests/icons';
import { ScheduleSaveBar } from './ArcSchedule';
import type { useScheduleSave } from './useScheduleSave';

const actions = { saving: false } as ReturnType<typeof useScheduleSave>;

describe('ScheduleSaveBar', () => {
    it('should label the delete button 刪除 with a trash icon', () => {
        render(
            <ScheduleSaveBar
                canDelete
                canSave={false}
                fromTodos={false}
                actions={actions}
                onDelete={() => {}}
                onSave={() => {}}
            />,
        );
        const remove = screen.getByRole('button', { name: /^刪除/ });
        expect(remove).toHaveTextContent(/^刪除$/);
        expect(hasIcon(remove, 'trash-2')).toBe(true);
    });
});
