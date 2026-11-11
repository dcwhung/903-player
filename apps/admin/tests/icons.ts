/* 測試用：掣入面有冇指定嘅 lucide outline icon（aria-hidden，讀屏只讀文字） */
export const hasIcon = (button: HTMLElement, icon: string) =>
    button.querySelector(`svg.lucide-${icon}[aria-hidden="true"]`) !== null;
