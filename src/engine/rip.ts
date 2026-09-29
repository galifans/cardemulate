/**
 * 拆包引擎
 *
 * 权重表：每个可开出的 VariantDef 权重 = 1 / 官方配率(1:X)。
 * 普通 Base 卡权重 = 残差（4 - Σ(1/X)），保证一包 4 张的期望分布
 * 与官方公布的平均配率一致。
 */

import type { BoxDefinition, PulledCard, VariantDef } from "./types";
import { createRng, fnv1a, type Rng } from "./rng";

export interface WeightEntry {
    variant: VariantDef;
    /** 累计权重上界，用于 O(log n) 二分抽样 */
    cum: number;
}

export interface WeightTable {
    entries: WeightEntry[];
    total: number;
}

export const buildWeightTable = (box: BoxDefinition): WeightTable => {
    const entries: WeightEntry[] = [];
    let total = 0;
    for (const variant of box.variants) {
        if (variant.weight <= 0) continue;
        total += variant.weight;
        entries.push({ variant, cum: total });
    }
    return { entries, total };
};

const sample = (table: WeightTable, rng: Rng): VariantDef => {
    const target = rng.next() * table.total;
    let lo = 0;
    let hi = table.entries.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (table.entries[mid]!.cum < target) lo = mid + 1;
        else hi = mid;
    }
    return table.entries[lo]!.variant;
};

/** 每包预期出现张数 */
export const expectedPerPack = (odds: number): number => (odds > 0 ? 1 / odds : 0);

/** 整盒预期出现张数 */
export const expectedPerBox = (odds: number, packsPerBox: number): number =>
    odds > 0 ? packsPerBox / odds : 0;

/** 一盒里至少出现 1 张的概率，0-1 */
export const boxProbability = (odds: number, packsPerBox: number): number =>
    odds > 0 ? 1 - Math.pow(1 - 1 / odds, packsPerBox) : 0;

/** 具体到某一张卡（子集内等概率） */
export const cardProbability = (odds: number, subsetSize: number): number =>
    odds > 0 && subsetSize > 0 ? 1 / (odds * subsetSize) : 0;

/** 1234 -> "1,234" */
export const formatOdds = (odds: number): string => {
    if (odds <= 0) return "—";
    if (!Number.isFinite(odds)) return "∞";
    return `1:${Math.round(odds).toLocaleString("en-US")}`;
};

export const formatPercent = (p: number, digits = 2): string => {
    if (p <= 0) return "0%";
    if (p >= 0.999999) return "100%";
    if (p < 0.0001) return `${(p * 100).toExponential(2)}%`;
    return `${(p * 100).toFixed(digits)}%`;
};

export interface RipOptions {
    /** 种子文本，相同种子 = 相同结果 */
    seed: string;
    /** 这一盒在用户历史里的序号，用于生成卡片唯一 id */
    boxIndex?: number;
}

export interface RipResult {
    cards: PulledCard[];
    seed: string;
    boxKey: string;
    /** 按子集统计的张数 */
    bySubset: Record<string, number>;
    /** 按稀有度统计的张数 */
    byTier: Record<string, number>;
    best: PulledCard | null;
}

const TIER_RANK: Record<string, number> = {
    mythic: 6,
    legendary: 5,
    epic: 4,
    rare: 3,
    uncommon: 2,
    common: 1,
};

/** a 是否比 b 更「值得晒」：稀有度 -> 配率 -> 限量数 -> 编号 */
const isBetter = (a: PulledCard, b: PulledCard): boolean => {
    const rankA = TIER_RANK[a.tier] ?? 0;
    const rankB = TIER_RANK[b.tier] ?? 0;
    if (rankA !== rankB) return rankA > rankB;
    if (a.odds !== b.odds) return a.odds > b.odds;
    const numA = a.numbered ?? Number.MAX_SAFE_INTEGER;
    const numB = b.numbered ?? Number.MAX_SAFE_INTEGER;
    if (numA !== numB) return numA < numB;
    return a.serial !== null && b.serial === null;
};

export const ripBox = (box: BoxDefinition, options: RipOptions): RipResult => {
    const table = buildWeightTable(box);
    const rng = createRng(`${box.key}|${options.seed}`);
    const subjectsBySubset = new Map(box.subsets.map((s) => [s.key, s.subjects]));
    const boxIndex = options.boxIndex ?? 0;

    const cards: PulledCard[] = [];
    const bySubset: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    let best: PulledCard | null = null;
    let counter = 0;

    for (let pack = 0; pack < box.packsPerBox; pack += 1) {
        for (let slot = 0; slot < box.cardsPerPack; slot += 1) {
            counter += 1;
            const variant = sample(table, rng);
            const subjects = subjectsBySubset.get(variant.subset) ?? [];
            const subject = subjects.length > 0 ? rng.pick(subjects) : undefined;
            const serial = variant.numbered !== null ? rng.int(1, variant.numbered) : null;

            const card: PulledCard = {
                id: `${options.seed}-${boxIndex}-${counter}-${fnv1a(`${variant.key}:${pack}:${slot}`)
                    .toString(36)
                    .slice(0, 5)}`,
                variantKey: variant.key,
                fullName: variant.fullName,
                subsetKey: variant.subset,
                subsetName: variant.subsetName,
                variantName: variant.variantName,
                group: variant.group,
                tier: variant.tier,
                player: subject?.player ?? "—",
                team: subject?.team ?? "—",
                no: subject?.no ?? "—",
                rookie: subject?.rookie ?? false,
                numbered: variant.numbered,
                serial,
                oddsLabel: formatOdds(variant.odds),
                odds: variant.odds,
                pack: pack + 1,
                slot: slot + 1,
            };

            cards.push(card);
            bySubset[variant.subset] = (bySubset[variant.subset] ?? 0) + 1;
            byTier[variant.tier] = (byTier[variant.tier] ?? 0) + 1;
            if (!best || isBetter(card, best)) best = card;
        }
    }

    return {
        cards,
        seed: options.seed,
        boxKey: box.key,
        bySubset,
        byTier,
        best,
    };
};
