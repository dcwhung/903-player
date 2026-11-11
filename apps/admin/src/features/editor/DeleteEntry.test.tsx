import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LoadedEntry } from '../../api/types';
import { hasIcon } from '../../../tests/icons';
import { renderAt } from '../../../tests/renderApp';
import { DeleteEntry } from './DeleteEntry';

const entry: LoadedEntry = {
    kind: 'shows',
    id: 'waves',
    definition: { name: '口水多過浪花' },
    images: {},
    draft: false,
    updatedAt: 'v1',
    etag: '"v1"',
};

describe('DeleteEntry', () => {
    it('should say a published entry cannot be deleted, in red, without the 下架 hint', () => {
        renderAt('/', '/', <DeleteEntry entry={entry} neverPublished={false} />);
        const note = screen.getByText('已發佈的項目不可刪除。');
        expect(note).toHaveClass('danger-note');
        expect(screen.queryByText(/如需下架/)).not.toBeInTheDocument();
    });

    it('should show the trash icon on the dialog delete button too', async () => {
        renderAt('/', '/', <DeleteEntry entry={entry} neverPublished />);
        await userEvent.click(screen.getByRole('button', { name: '刪除' }));
        const dialog = screen.getByRole('dialog');
        const confirm = dialog.querySelector('button.danger') as HTMLElement;
        expect(hasIcon(confirm, 'trash-2')).toBe(true);
    });
});
