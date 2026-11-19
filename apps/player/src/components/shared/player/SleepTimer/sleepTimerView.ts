interface SleepTimerViewInput {
    /** 裝置本地 21:00–05:00（useNightWindow） */
    night: boolean;
    hasTimer: boolean;
    remaining: number;
}

export interface SleepTimerView {
    /** 出唔出月亮掣：夜間或者 timer 開緊 */
    visible: boolean;
    /** 開緊（實色月亮 + 分秒 + 進度條） */
    active: boolean;
}

/**
 * 月亮掣顯示狀態（9d）。剩 0 當未開：重新載入時過咗期嘅「播完呢集」喺 controller attach 之前
 * 可能喺 snapshot 出一格，唔好閃出實色「0:00」（日間就連掣都唔出）
 */
export const sleepTimerView = ({
    night,
    hasTimer,
    remaining,
}: SleepTimerViewInput): SleepTimerView => {
    const active = hasTimer && remaining > 0;
    return { visible: night || active, active };
};
