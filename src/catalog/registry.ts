/**
 * 盒型注册中心。
 *
 * 每个系列的 box.ts 在模块求值时调用 defineBox() -> registerBox()，
 * 最终由 src/data/sets/index.ts 统一引入。目录层（CATEGORIES / PRODUCTS）
 * 完全由这里的数据推导，因此「加数据即上架」，不需要再手写目录条目。
 */
import type { BoxDefinition } from "../engine/types";

const registry = new Map<string, BoxDefinition>();

/** 注册一个盒型；重复 key 直接抛错，避免覆盖 */
export function registerBox(box: BoxDefinition): BoxDefinition {
    if (registry.has(box.key)) {
        throw new Error(`[cardemulate] 盒型 key 重复：${box.key}`);
    }
    registry.set(box.key, box);
    return box;
}

/** 批量注册 */
export function registerBoxes(list: BoxDefinition[]): BoxDefinition[] {
    for (const box of list) registerBox(box);
    return list;
}

/** 全部盒型（按注册顺序） */
export function boxList(): BoxDefinition[] {
    return Array.from(registry.values());
}

/** 按 key 取盒型 */
export function boxByKey(key: string): BoxDefinition | undefined {
    return registry.get(key);
}

/** 按维度筛选盒型；未提供的维度不参与筛选 */
export function boxesWhere(filter: {
    category?: string;
    maker?: string;
    productKey?: string;
    live?: boolean;
}): BoxDefinition[] {
    return boxList().filter(
        (box) =>
            (filter.category === undefined || box.category === filter.category) &&
            (filter.maker === undefined || box.maker === filter.maker) &&
            (filter.productKey === undefined || box.productKey === filter.productKey) &&
            (filter.live === undefined || box.live === filter.live),
    );
}
