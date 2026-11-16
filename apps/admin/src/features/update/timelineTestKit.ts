/* Timeline test 共用：fixture（蘭茜夫人劇場）、LoadedEntry、分組 / 卡 / 行 / 碟面 selector */
import type { ChangeDocument } from '@903-player/catalog';
import { screen, within } from '@testing-library/react';
import type { LoadedEntry } from '../../api/types';

/** shortDate / fullDate 跨年會加年份（S-830）：固定「今日」喺 2026，唔跟真實時鐘 */
export const fixToday = () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-12T04:00:00Z'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });
};

export type Images = Record<string, string>;

export const drama = (arcs: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        addedAt: '2026-10-01',
        disc: 'disc.webp',
        arcs,
        ...extra,
    },
    images: {} as Images,
});

export const loaded = (doc: ChangeDocument): LoadedEntry[] =>
    doc.dramas.map((entry) => ({
        kind: 'dramas',
        id: entry.id,
        definition: entry.definition as LoadedEntry['definition'],
        images: entry.images as Images,
        draft: false,
        updatedAt: 'v',
        etag: null,
    }));

export const groupsOf = () =>
    screen.getAllByRole('listitem').filter((li) => li.matches('.timeline > li'));
export const cardsIn = (group: HTMLElement) =>
    within(group)
        .getAllByRole('listitem')
        .filter((li) => li.matches('.tl-entry'));
export const rowsIn = (card: HTMLElement) =>
    within(card)
        .getAllByRole('listitem')
        .map((li) => li.textContent);
export const discOf = (el: Element | null) => (el as HTMLElement | null)?.style.backgroundImage;
