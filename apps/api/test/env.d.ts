// cloudflare:test 嘅 env = Worker 嘅 Env + test 專用 binding
import type { D1Migration } from 'cloudflare:test';
import type { Env } from '../src/env';

declare global {
    namespace Cloudflare {
        interface Env extends AppEnv {
            TEST_MIGRATIONS: D1Migration[];
        }
    }
}

type AppEnv = Env;
