/* dnd-kit 讀屏文字（中文）：拎起 / 移動 / 放低 / 取消 */
import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import { t } from '../i18n/t';

export const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: t('dnd.instructions'),
};

export const announcementsFor = (
    labelOf: (id: string) => string,
    positionOf: (id: string) => number,
): Announcements => ({
    onDragStart: ({ active }) => t('dnd.picked', { name: labelOf(String(active.id)) }),
    onDragOver: ({ active, over }) =>
        over
            ? t('dnd.moved', {
                  name: labelOf(String(active.id)),
                  position: positionOf(String(over.id)) + 1,
              })
            : undefined,
    onDragEnd: ({ active, over }) =>
        t('dnd.dropped', {
            name: labelOf(String(active.id)),
            position: positionOf(String(over?.id ?? active.id)) + 1,
        }),
    onDragCancel: ({ active }) => t('dnd.cancelled', { name: labelOf(String(active.id)) }),
});
