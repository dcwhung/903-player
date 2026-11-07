/*
 * lib 唔包 DOM（package 要喺 browser 同 Node 都用得）：TypeScript 只喺 lib.dom / @types/node 宣告 console，
 * 呢度淨係宣告用到嘅 console.warn（selectors/availability.ts 嘅「過咗上架日未補 episodes」提醒）
 */
interface Console {
    warn(...data: unknown[]): void;
}

declare const console: Console;
