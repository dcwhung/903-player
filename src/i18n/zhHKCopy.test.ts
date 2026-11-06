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

    // S-717 / S-718：字典入面唔再寫死「 · 」（只有 common.separator 自己），畫面用 {sep}、讀屏用「，」
    it('should not hard-code the middle-dot separator outside common.separator', () => {
        const hardCoded = ALL.filter(
            ([key, text]) => key !== 'common.separator' && text.includes('·'),
        );
        expect(hardCoded).toEqual([]);
    });

    // S-718：「播放中 · 0:05 / 21:56」由 common.status.playing 砌，唔重複寫「播放中」
    it('should compose episodes.playing from common.status.playing', () => {
        expect(zhHK.episodes.playing).not.toContain('播放中');
        expect(
            t('episodes.playing', {
                playing: t('common.status.playing'),
                current: '0:05',
                total: '21:56',
            }),
        ).toBe('播放中 · 0:05 / 21:56');
    });

    // B2a
    it('should hint swipe-left or the delete key to remove a bookmark', () => {
        expect(t('bookmark.removeHint')).toBe('向左滑動或者撳刪除鍵移除收藏');
    });

    // S-716：短篇劇名讀屏用「，」
    it('should join the series spoken name with a full-width comma', () => {
        expect(t('bookmark.seriesSpokenName', { title: '芝See菇Bi Family', arc: '三十六計' })).toBe(
            '芝See菇Bi Family，三十六計',
        );
    });

    // D4a / D4c
    it('should say 全新短篇 / 全新集數 for what is coming, and 有新上架短篇 for the 新 badge', () => {
        expect(t('availability.tileNewArc', { when: '02/12 上架' })).toBe('全新短篇 02/12 上架');
        expect(t('availability.tileNextArcSpoken', { when: '02/12 星期三 上架' })).toBe(
            '全新短篇 02/12 星期三 上架',
        );
        expect(t('availability.tileNextEpisodesSpoken', { when: '02/12 星期三 上架' })).toBe(
            '全新集數 02/12 星期三 上架',
        );
        expect(t('availability.tileNewEpisodes', { when: '02/12 上架' })).toBe(
            '全新集數 02/12 上架',
        );
        expect(t('availability.leavingEpisodes', { when: '05/12 下架' })).toBe(
            '部分集數 05/12 下架',
        );
        expect(t('drama.newArc')).toBe('有新上架短篇');
    });
});
