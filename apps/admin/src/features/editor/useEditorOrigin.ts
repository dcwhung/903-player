/*
 * 由待辦入嚟（?from=todos&todo=key）：flow bar 講仲欠乜、儲存掣叫「儲存並返回待辦」、存完返待辦；
 * 由列表入嚟：「儲存」、冇 flow bar
 */
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { FROM_TODOS, missingOf, splitName, todoKey } from '../update/todoModel';

export const useEditorOrigin = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { todos, refresh } = useAdminData();
    const fromTodos = params.get('from') === FROM_TODOS;
    const key = params.get('todo');
    const row = fromTodos ? todos.data?.rows.find((r) => todoKey(r) === key) : undefined;
    const flow =
        fromTodos && row
            ? {
                  name: [splitName(row).drama, splitName(row).title].filter(Boolean).join(' › '),
                  missing: missingOf(row),
              }
            : null;
    /** 儲存成功之後：刷新共用資料；由待辦入嚟就返待辦 */
    const afterSave = async () => {
        await refresh();
        if (fromTodos) navigate('/');
    };
    return { fromTodos, flow, afterSave };
};
