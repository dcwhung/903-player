import { screen } from '@testing-library/react';
import { renderAt } from '../../../tests/renderApp';
import { DramaTabs } from './DramaTabs';

describe('DramaTabs', () => {
    it('should encode the drama ID in every tab link (S-857)', () => {
        renderAt(
            '/dramas/a%20b?from=todos',
            '/dramas/:id',
            <DramaTabs id="a b" tab="basic" arcCount={2} arc="half" />,
        );
        const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
        expect(hrefs).toEqual([
            '/dramas/a%20b?from=todos',
            '/dramas/a%20b/theme?from=todos',
            '/dramas/a%20b/arcs?from=todos#half',
            '/dramas/a%20b/schedule?from=todos#half',
        ]);
        // 配色緊接基本資料（2026-11-13）
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
            '基本資料',
            '配色',
            '短篇（2）',
            '排程',
        ]);
    });
});
