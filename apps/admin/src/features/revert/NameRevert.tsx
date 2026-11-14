/* 標題旁（名稱冇欄位，雙擊標題改名）：名稱同已發佈唔同就出「已修改」「還原」 */
import { t } from '../../i18n/t';
import type { EntryEditor } from '../editor/useEntryEditor';
import { RevertMark } from './FieldRevert';
import { NAME_FIELDS } from './placedFields';
import { useEntryRevert } from './useEntryRevert';

export function NameRevert({ editor }: { editor: EntryEditor }) {
    const revert = useEntryRevert(editor);
    return <RevertMark revert={revert} fields={NAME_FIELDS} name={t('fields.name')} />;
}
