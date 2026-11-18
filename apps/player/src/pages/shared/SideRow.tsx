import type { ReactNode } from 'react';
import page from './Page.module.css';

/** 有 side 就唱片同 side 左右並排（page.sideRow），冇就淨係唱片 */
export const SideRow = ({ side, children }: { side: ReactNode; children: ReactNode }) =>
    side ? (
        <div className={page.sideRow}>
            {children}
            {side}
        </div>
    ) : (
        children
    );
