import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { fakeData, resource } from '../../../tests/renderApp';
import type { ChangesResponse, TodoRow } from '../../api/types';
import { AdminDataContext } from '../../data/AdminData';
import { PublishSelectionProvider } from './PublishSelection';
import { usePublishPlan } from './usePublishPlan';

const ROW = { key: 'newArc/lancy/love-after', publish: 'selectable' } as TodoRow;

const CHANGES: ChangesResponse = {
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    appearance: { icon: false, text: true, banner: false },
    others: { items: [], timeline: [] },
};

const SELECTION = {
    content: ['newArc/lancy/love-after'],
    branding: { icon: false, text: true },
    banner: false,
};

const planOf = (rows: TodoRow[], changes: ChangesResponse | undefined, failed = false) => {
    const changesResource = {
        ...resource(changes),
        error: failed ? new Error('boom') : undefined,
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminDataContext.Provider
            value={fakeData({
                todos: resource({ rows, blocking: 0 }),
                changes: changesResource,
            })}
        >
            <PublishSelectionProvider>{children}</PublishSelectionProvider>
        </AdminDataContext.Provider>
    );
    return renderHook(() => usePublishPlan(), { wrapper }).result.current;
};

describe('usePublishPlan', () => {
    it('should return the selection and the 確認發佈 path built from it', () => {
        const plan = planOf([ROW], CHANGES);
        expect(plan.selection).toEqual(SELECTION);
        expect(decodeURIComponent(plan.path ?? '')).toBe(
            `/publish?selection=${JSON.stringify(SELECTION)}`,
        );
    });

    it('should have no path while changes are loading, failed, or nothing is to publish', () => {
        expect(planOf([ROW], undefined).path).toBeUndefined();
        expect(planOf([ROW], CHANGES, true).path).toBeUndefined();
        const nothing = { ...CHANGES, appearance: { icon: false, text: false, banner: false } };
        expect(planOf([], nothing).path).toBeUndefined();
    });

    it('should still build the selection while changes are loading', () => {
        expect(planOf([ROW], undefined).selection.content).toEqual(['newArc/lancy/love-after']);
    });
});
