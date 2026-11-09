/* Hono 共用型別：bindings + middleware 放入 context 嘅值 */
import type { Env } from './env';

export interface AppEnv {
    Bindings: Env;
    Variables: {
        /** requireSession 驗過嘅 admin email */
        email: string;
    };
}
