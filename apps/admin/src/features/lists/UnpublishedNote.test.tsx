import { screen } from '@testing-library/react';
import type { ChangesResponse } from '../../api/types';
import { hasIcon } from '../../../tests/icons';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import { UnpublishedNote } from './UnpublishedNote';

const changes = {
    base: null,
    changes: { items: [{}], timeline: [] },
    validation: { ok: true, episodeCount: 1 },
} as unknown as ChangesResponse;

describe('UnpublishedNote', () => {
    it('should put an arrow after 前往發佈', () => {
        renderAt('/', '/', <UnpublishedNote />, fakeData({ changes: resource(changes) }));
        const go = screen.getByRole('link', { name: '前往發佈' });
        expect(go).toHaveAttribute('href', '/publish');
        expect(hasIcon(go, 'arrow-right')).toBe(true);
    });
});
