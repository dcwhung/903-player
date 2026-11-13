/* 圖片上載即存：用最新已儲存版本 + 新圖 PUT（唔連埋其他未儲存改動），成功後同步落草稿 */
import type { ImageMap, RawDefinition } from '../../api/types';
import type { ImageSlotKind } from '../../ui/imageUpload';
import { imageFileFor, withImageFile } from './imagePatch';
import type { EntryEditor } from './useEntryEditor';

interface ImageDraft {
    definition: RawDefinition;
    images: ImageMap;
}

/** definition 指去 slot 嘅檔名（冇就用慣例名），images 加 檔名 → 圖檔名 */
export const withImage =
    (slot: ImageSlotKind, name: string, arcId?: string) =>
    <T extends ImageDraft>(draft: T): T => {
        const file = imageFileFor(draft.definition, slot, arcId);
        return {
            ...draft,
            definition: withImageFile(draft.definition, slot, file, arcId),
            images: { ...draft.images, [file]: name },
        };
    };

export const useImageSave =
    (editor: EntryEditor) => async (slot: ImageSlotKind, name: string, arcId?: string) => {
        await editor.patchSaved(withImage(slot, name, arcId));
    };
