/**
 * 确定性随机数：给定同一个种子，必须还原出完全相同的卡盒内容。
 * 这样用户才能「保存种子 / 复现同一盒」，也方便做验证。
 */

/** FNV-1a 32 位字符串哈希 */
export const fnv1a = (input: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
};

/** mulberry32：轻量、快速、分布均匀的 PRNG */
export const mulberry32 = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export interface Rng {
    next: () => number;
    int: (min: number, max: number) => number;
    pick: <T>(items: readonly T[]) => T;
}

export const createRng = (seedText: string): Rng => {
    const base = mulberry32(fnv1a(seedText));
    // 预热，避免低种子时前几个数偏斜
    for (let i = 0; i < 8; i += 1) base();

    const next = (): number => base();
    return {
        next,
        int: (min: number, max: number): number => min + Math.floor(next() * (max - min + 1)),
        pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    };
};

/** 生成给用户看的随机种子（大写 + 数字，去掉易混淆字符） */
export const randomSeed = (): string => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 10; i += 1) {
        if (i === 5) out += "-";
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
};
