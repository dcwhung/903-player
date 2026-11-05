import { t } from './t';
import { zhHK } from './zh-HK';

/** 字典展平：[key, 字] */
const leaves = (node: object, prefix = ''): [string, string][] =>
    Object.entries(node).flatMap(([key, value]) =>
        typeof value === 'string'
            ? [[`${prefix}${key}`, value] as [string, string]]
            : leaves(value as object, `${prefix}${key}.`),
    );

const ALL = leaves(zhHK);

/** 文案決定（用戶 2026-11-05 確認，P7 部分） */
describe('zh-HK copy decisions', () => {
    // A4：重複嘅狀態字抽做一組 common key，各處引用同一個
    it('should keep each status word in one common key only', () => {
        expect(zhHK.common.status).toEqual({
            playing: '播放中',
            paused: '已暫停',
            watched: '已收聽',
            unwatched: '未收聽',
            resume: '聽到 {time}',
            resumeOf: '聽到 {current} / {total}',
        });
        const words: readonly string[] = Object.values(zhHK.common.status);
        const duplicates = ALL.filter(
            ([key, text]) => !key.startsWith('common.status.') && words.includes(text),
        );
        expect(duplicates).toEqual([]);
    });

    // A1：全 app「已聽完」統一做「已收聽」
    it('should not say 已聽完 anywhere', () => {
        expect(ALL.filter(([, text]) => text.includes('已聽完'))).toEqual([]);
    });

    // C3：「左右掃動」→「左右滑動」
    it('should say 左右滑動, not 左右掃動', () => {
        expect(ALL.filter(([, text]) => text.includes('掃動'))).toEqual([]);
        expect(t('cardStack.label')).toBe('今日節目，左右滑動轉節目');
        expect(t('episodes.switchHint')).toBe('左右方向鍵或左右滑動轉集');
    });

    // B4
    it('should name the player bookmark button 收藏本集', () => {
        expect(t('bookmark.toggleCurrent')).toBe('收藏本集');
    });

    // G2：「·」分隔符得一個 key（前後有空格）
    it('should keep the middle-dot separator in one common key', () => {
        expect(t('common.separator')).toBe(' · ');
    });
});
