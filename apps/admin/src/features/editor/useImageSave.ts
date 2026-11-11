/* 圖片上載即存：用已儲存版本 + 新圖 PUT（唔連埋其他未儲存改動），成功後同步落草稿 */
import type { ImageSlotKind } from '../../ui/imageUpload';
import { imageFileFor, withImageFile } from './imagePatch';
import type { EntryEditor } from './useEntryEditor';

export const useImageSave =
    (editor: EntryEditor) => async (slot: ImageSlotKind, name: string, arcId?: string) => {
        const { entry, setDraft, run } = editor;
        const apply = (d: {
            definition: Record<string, unknown>;
            images: Record<string, string>;
        }) => {
            const file = imageFileFor(d.definition, slot, arcId);
            return {
                definition: withImageFile(d.definition, slot, file, arcId),
                images: { ...d.images, [file]: name },
            };
        };
        // 新增模式：未有 entry，跟埋撳「儲存」先寫
        if (entry && !(await run(apply(entry)))) return;
        setDraft((d) => d && apply(d));
    };
