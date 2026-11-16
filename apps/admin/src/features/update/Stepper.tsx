/*
 * 更新 stepper：掃描 R2（自動）→ 處理待辦 → 確認發佈（mockup .stepper）。
 * 處理待辦 / 確認發佈 可以撳去嗰頁（而家嗰步同自動掃描唔係 link）；
 * 去確認發佈帶住「下一步」同一個選擇，返處理待辦同「返回待辦」一樣（選擇喺 context 保留）
 */
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t, type MessageKey } from '../../i18n/t';
import { usePublishPlan } from './usePublishPlan';

type StepNo = 1 | 2 | 3;

const STEPS: readonly MessageKey[] = ['update.stepScan', 'update.stepTodos', 'update.stepPublish'];

const TODOS_PATH = '/';

/** 第 no 步撳去邊（undefined = 唔係 link） */
const targetOf = (no: StepNo, current: 2 | 3, publishPath: string | undefined) => {
    if (no === current) return undefined;
    if (no === 2) return TODOS_PATH;
    if (no === 3) return publishPath;
    return undefined;
};

/** current = 第幾步（1-based） */
export function Stepper({ current }: { current: 2 | 3 }) {
    const { path: publishPath } = usePublishPlan();
    return (
        <ol className="stepper">
            {STEPS.map((key, i) => {
                const no = (i + 1) as StepNo;
                const state = no < current ? 'done' : no === current ? 'current' : undefined;
                const target = targetOf(no, current, publishPath);
                const content = (
                    <>
                        <span className="num" aria-hidden="true">
                            {state === 'done' ? <Check /> : no}
                        </span>
                        {t(key)}
                    </>
                );
                return (
                    <li
                        key={key}
                        className={state}
                        aria-current={state === 'current' ? 'step' : undefined}
                    >
                        {target ? (
                            <Link className="step-link" to={target}>
                                {content}
                            </Link>
                        ) : (
                            content
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
