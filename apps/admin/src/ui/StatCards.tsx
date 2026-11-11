/*
 * 漸變統計卡：Design Origin: mockup: _mockups_/admin-style/index.html#a / #h（.stats .stat）
 * 白字大數字 + icon；顏色 = 意思（天藍 新內容、紅 必須處理、橙 選填、綠 已完成）
 */
import type { LucideIcon } from 'lucide-react';

export interface Stat {
    key: string;
    tone: 'sky' | 'red' | 'orange' | 'green';
    icon: LucideIcon;
    value: number;
    label: string;
}

export function StatCards({ stats, label }: { stats: readonly Stat[]; label: string }) {
    return (
        <ul className="stats" aria-label={label}>
            {stats.map(({ key, tone, icon: Icon, value, label: text }) => (
                <li key={key} className={`stat ${tone}`}>
                    <span className="ico" aria-hidden="true">
                        <Icon />
                    </span>
                    <span>
                        <b>{value}</b>
                        <span className="stat-label">{text}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}
