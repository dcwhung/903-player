/*
 * 畫面字同讀屏字唔同嘅一句（W-537）：畫面「本廣播劇系列 明日下架」/「05/12（六）」，
 * 讀屏一律讀屏版日子「05/12 星期六」（E1）。畫面字 aria-hidden，旁邊一段視覺上隱藏嘅讀屏字
 */
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';

export interface SpokenNotice {
    /** 畫面字 */
    text: string;
    /** 讀屏字 */
    label: string;
}

export const SpokenText = ({ text, label }: SpokenNotice) => (
    <>
        <span aria-hidden="true">{text}</span>
        <VisuallyHidden>{label}</VisuallyHidden>
    </>
);
