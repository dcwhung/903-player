import { screen } from '@testing-library/react';
import type { LoadedEntry } from '../../api/types';
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
});
