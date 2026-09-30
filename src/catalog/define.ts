/**
 * 盒型构造与自检。
 *
 * 所有盒型都必须经过 defineBox()：
 *   1. 自动派生全局唯一 key：`${category}.${maker}.${productKey}.${slug}`；
 *   2. 做一次数据自检（子集/卡种引用、权重、配率数学），把错误挡在开发阶段。
 *
 * 新增盒型时只需按约定填字段，key 与一致性检查交给这里。
 */
import type { BoxDefinition } from "../engine/types";

/** 盒型 key 约定：category.maker.productKey.slug，全局唯一，直接入库 */
export const boxKey = (category: string, maker: string, productKey: string, slug: string): string =>
    `${category}.${maker}.${productKey}.${slug}`;

/** 只允许小写字母、数字与短横线，冒号用于子集/卡种分层 */
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** 年份：单年 "2026"，跨年赛季 "2025-26" */
const YEAR_RE = /^\d{4}(-\d{2})?$/;

export type BoxInput = Omit<BoxDefinition, "key">;

const isDev = ((): boolean => {
    try {
        const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
        return env?.DEV === true;
    } catch {
        return false;
    }
})();

/** 配率 1:X 下的权重之和，用于校验残差数学 */
const premiumWeight = (box: BoxDefinition): number =>
    box.variants.reduce((sum, v) => (v.odds > 0 ? sum + 1 / v.odds : sum), 0);

/** 返回问题列表；空数组代表数据健康 */
export function validateBox(box: BoxDefinition): string[] {
    const problems: string[] = [];

    for (const [label, value] of [
        ["cardsPerPack", box.cardsPerPack],
        ["packsPerBox", box.packsPerBox],
    ] as const) {
        if (!Number.isInteger(value) || value <= 0) problems.push(`${label} 必须是正整数，当前为 ${value}`);
    }

    // boxesPerCase 为 0 = 官方未公布，不是错误；负数或小数才是
    if (!Number.isInteger(box.boxesPerCase) || box.boxesPerCase < 0) {
        problems.push(`boxesPerCase 必须是非负整数，当前为 ${box.boxesPerCase}`);
    }

    for (const [label, value] of [
        ["category", box.category],
        ["maker", box.maker],
        ["productKey", box.productKey],
        ["slug", box.slug],
    ] as const) {
        if (!SLUG_RE.test(value)) problems.push(`${label} 必须是小写 slug（a-z0-9-），当前为 "${value}"`);
    }

    // 年份是目录分组依据，格式错了会让系列排不进任何一组
    if (!YEAR_RE.test(box.year)) {
        problems.push(`year 必须是 2026 或 2025-26 这样的年份，当前为 "${box.year}"`);
    }

    // 盒型名是「产品全名 + 盒型 + Box」，因此一定以年份开头；
    // 只写 "Hobby" 这种短名会让统计页看不出是哪个系列
    if (!box.name.startsWith(box.year)) {
        problems.push(`name 要以年份开头（产品全名 + 盒型），当前为 "${box.name}"`);
    }

    if (box.key !== boxKey(box.category, box.maker, box.productKey, box.slug)) {
        problems.push(`key 与命名约定不一致：${box.key}`);
    }

    if (!box.subsets.length) problems.push("subsets 为空");
    if (!box.variants.length) problems.push("variants 为空");

    const subsetKeys = new Set<string>();
    for (const subset of box.subsets) {
        if (subsetKeys.has(subset.key)) problems.push(`子集 key 重复：${subset.key}`);
        subsetKeys.add(subset.key);
        if (subset.detailed && !subset.subjects.length) {
            problems.push(`子集 ${subset.key} 标记为 detailed 但没有球员名单`);
        }
        const seenNo = new Set<string>();
        for (const subject of subset.subjects) {
            if (seenNo.has(subject.no)) problems.push(`子集 ${subset.key} 内卡号重复：#${subject.no}`);
            seenNo.add(subject.no);
        }
    }

    const variantKeys = new Set<string>();
    let premiumCount = 0;
    for (const variant of box.variants) {
        if (variantKeys.has(variant.key)) problems.push(`卡种 key 重复：${variant.key}`);
        variantKeys.add(variant.key);

        if (!subsetKeys.has(variant.subset)) {
            problems.push(`卡种 ${variant.key} 引用了不存在的子集 ${variant.subset}`);
        }
        if (variant.odds < 0 || !Number.isFinite(variant.odds)) {
            problems.push(`卡种 ${variant.key} 的 odds 不合法：${variant.odds}`);
        }
        if (variant.odds > 0) {
            premiumCount += 1;
            if (variant.weight <= 0) problems.push(`卡种 ${variant.key} 有配率但权重为 0`);
        }
        if (variant.numbered !== null && (!Number.isInteger(variant.numbered) || variant.numbered <= 0)) {
            problems.push(`卡种 ${variant.key} 的编号数量不合法：${variant.numbered}`);
        }
    }

    if (!premiumCount) problems.push("没有任何带配率的卡种（odds > 0）");

    const premium = premiumWeight(box);
    if (premium > box.cardsPerPack) {
        problems.push(
            `带配率卡种权重合计 ${premium.toFixed(3)} 超过每包张数 ${box.cardsPerPack}，残差为负，请检查配率`,
        );
    }
    if (!(box.baseWeight > 0) || box.baseWeight > box.cardsPerPack) {
        problems.push(`baseWeight 不合法：${box.baseWeight}`);
    }

    return problems;
}

/** 构造并注册前置校验的盒型 */
export function defineBox(input: BoxInput): BoxDefinition {
    const box: BoxDefinition = { ...input, key: boxKey(input.category, input.maker, input.productKey, input.slug) };
    const problems = validateBox(box);
    if (problems.length) {
        const message = `[cardemulate] 盒型 ${box.key} 数据自检未通过：\n- ${problems.join("\n- ")}`;
        // 开发环境直接中断，构建/线上只打印，避免整站白屏
        if (isDev) throw new Error(message);
        console.error(message);
    }
    return box;
}
