/* 更新 stepper：掃描 R2（自動）→ 處理待辦 → 確認發佈（mockup .stepper） */
import { Check } from 'lucide-react';
import { t, type MessageKey } from '../../i18n/t';

const STEPS: readonly MessageKey[] = ['update.stepScan', 'update.stepTodos', 'update.stepPublish'];

/** current = 第幾步（1-based） */
export function Stepper({ current }: { current: 2 | 3 }) {
    return (
        <ol className="stepper">
            {STEPS.map((key, i) => {
                const no = i + 1;
                const state = no < current ? 'done' : no === current ? 'current' : undefined;
                return (
                    <li
                        key={key}
                        className={state}
                        aria-current={state === 'current' ? 'step' : undefined}
                    >
                        <span className="num" aria-hidden="true">
                            {state === 'done' ? <Check /> : no}
                        </span>
                        {t(key)}
                    </li>
                );
            })}
        </ol>
    );
}
