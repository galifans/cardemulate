/**
 * 成交样本的装载与多因子中位数抛光（median polish）—— 拟合与校验共用的一份。
 *
 * 为什么要有这一层
 * ----------------
 * `fit-sales-model.ts` 要量系数、`check-sales-fit.ts` 要拿量出来的系数跟仓库里
 * 实际生效的常数对比。两边必须用**同一套**口径（同样的过滤、同样的分档、同样的
 * 抛光），否则「模型对样本」这个结论就只是在比两套不同的算法。所以装载、分档、
 * 抛光这三件事只写一遍。
 *
 * 抛光是什么
 * ----------
 * 把 `log10(成交价)` 拆成若干维度各自的一堆常数，反复取中位数迭代到稳定。
 *
 * 为什么不直接比中位数：直接在全部样本里比「非编号中位 ¥22」与「/10 中位 ¥265」，
 * 这 12 倍里混着「/10 的那批卡本来就出在人物更好的卡种上」这一层。抛光让同一球员、
 * 同一系列、同一卡类的记录相互抵消，剩下的才是印量自己的倍数。
 *
 * 取中位数而不是平均值：成交价里有 ￥10,000,000 这种占位挂牌和大量流拍尾货，
 * 均值会被单条带跑。
 */
import { existsSync, readFileSync } from "node:fs";

import { DRAFT_PICKS_2025 } from "../../src/data/prices/draft-order.generated";
import { ALL_STARS, ELITES, SUPERSTARS } from "../../src/data/prices/players";
import { REGISTERED_BOXES } from "../../src/data/sets";
import { MIN_BIDS, median, parseSale } from "./parse-sales";
import type { ParsedSale } from "./parse-sales";

export { median };

/** 默认样本文件 */
export const DEFAULT_CORPUS = ".snapshot/card-sales.jsonl";

/** 印量分档：断点与模型的编号阶梯同一套，方便逐格对照 */
export const PRINT_BUCKETS: [label: string, max: number][] = [
    ["/1", 1],
    ["/2-9", 9],
    ["/10-24", 24],
    ["/25-49", 49],
    ["/50-99", 99],
    ["/100-199", 199],
    ["/200-399", 399],
    ["/400+", Number.POSITIVE_INFINITY],
];

/** 名字骨架：官方 checklist 的写法与选秀名单、与仓库里的写法未必一致 */
export const skeleton = (name: string): string =>
    name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

export interface Sale extends ParsedSale {
    price: number;
    bids: number;
    soldAt: string;
    /** 选秀顺位；不是选秀球员时为 null */
    pick: number | null;
}

export interface Corpus {
    sales: Sale[];
    /** 名册里全部球员名，按长度倒序（解析标题时取最长匹配） */
    nameList: string[];
    /** 已进球员档位表的球员（骨架形式） */
    graded: Set<string>;
}

/** 读样本文件；文件不存在时返回 null，由调用方决定怎么提示 */
export function loadCorpus(file: string = DEFAULT_CORPUS): Corpus | null {
    if (!existsSync(file)) return null;

    const names = new Set<string>();
    for (const box of REGISTERED_BOXES) {
        for (const subset of box.subsets) {
            for (const subject of subset.subjects) names.add(subject.player);
        }
    }
    const nameList = [...names].sort((a, b) => b.length - a.length);

    const pickBySkeleton = new Map<string, number>();
    for (const row of DRAFT_PICKS_2025) pickBySkeleton.set(skeleton(row.player), row.pick);

    const sales: Sale[] = [];
    for (const line of readFileSync(file, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
            const row = JSON.parse(line);
            const parsed = parseSale(row.title, nameList);
            if (parsed.pack || row.bids < MIN_BIDS || row.price < 2) continue;
            sales.push({
                ...parsed,
                price: row.price,
                bids: row.bids,
                soldAt: row.soldAt,
                pick: parsed.player ? (pickBySkeleton.get(skeleton(parsed.player)) ?? null) : null,
            });
        } catch {
            /* 坏行跳过：样本文件是流式写出来的，最后一行可能被截断 */
        }
    }

    return {
        sales,
        nameList,
        graded: new Set([...SUPERSTARS, ...ELITES, ...ALL_STARS].map(skeleton)),
    };
}

export const printBucket = (numbered: number | null): string => {
    if (numbered === null) return "非编号";
    for (const [label, max] of PRINT_BUCKETS) if (numbered <= max) return label;
    return "/400+";
};

/** 年份换算成年代：两头样本都稀，用区间换样本量 */
export const eraOf = (year: number | null): string => {
    if (year === null) return "(未知)";
    if (year <= 1995) return "≤1995";
    if (year <= 1999) return "1996-99";
    if (year <= 2004) return "2000-04";
    if (year <= 2009) return "2005-09";
    if (year <= 2018) return "2010-18";
    if (year <= 2021) return "2019-21";
    if (year <= 2023) return "2022-23";
    if (year <= 2024) return "2024";
    if (year <= 2025) return "2025";
    return "2026";
};

/** 顺位分档；与 price/draft.ts 的阶梯同一套断点 */
export const pickTier = (pick: number | null): string => {
    if (pick === null) return "(非选秀球员)";
    if (pick === 1) return "状元";
    if (pick <= 3) return "榜眼–探花";
    if (pick <= 14) return "乐透 4–14";
    if (pick <= 30) return "首轮末 15–30";
    return "次轮 31+";
};

/** 可参与抛光的维度 */
export type Dim = "series" | "player" | "kind" | "print" | "rookie" | "era" | "pick";

export const keyOf = (dim: Dim, sale: Sale): string => {
    switch (dim) {
        case "series":
            return sale.series ?? "(未识别系列)";
        case "player":
            return sale.player ?? "(未识别球员)";
        case "kind":
            return sale.kind;
        case "print":
            return printBucket(sale.numbered);
        case "rookie":
            return sale.rookie ? "新秀" : "非新秀";
        case "era":
            return eraOf(sale.year);
        case "pick":
            return pickTier(sale.pick);
    }
};

/** 各维度的自然展示顺序 */
export const DIM_ORDER: Record<Dim, string[]> = {
    print: PRINT_BUCKETS.map(([label]) => label).concat("非编号"),
    pick: ["状元", "榜眼–探花", "乐透 4–14", "首轮末 15–30", "次轮 31+", "(非选秀球员)"],
    era: ["≤1995", "1996-99", "2000-04", "2005-09", "2010-18", "2019-21", "2022-23", "2024", "2025", "2026", "(未知)"],
    kind: ["base", "parallel", "insert", "relic", "auto", "ssp"],
    rookie: ["新秀", "非新秀"],
    series: [],
    player: [],
};

export interface FitResult {
    /** `${维度}\u0001${层级}` -> log10 倍率 */
    coef: Map<string, number>;
    /** 各层级的样本量 */
    n: Map<string, number>;
    /** 样本内中位绝对残差（数量级） */
    resid: number;
    /** 各维度合计解释了 log10 价格散布的多少 */
    explain: number;
    rows: number;
}

/** 样本量低于这个数的层级并成一个占位层，否则每层都被单条记录决定 */
const MIN_LEVEL_N = 12;

/** 抛光。dims 里的维度必须互不共线，见 fit-sales-model.ts 文件头的说明 */
export function polish(subset: Sale[], dims: Dim[]): FitResult {
    const y = subset.map((sale) => Math.log10(sale.price));

    const counts = new Map<string, number>();
    for (const sale of subset) {
        for (const dim of dims) {
            const k = `${dim}\u0001${keyOf(dim, sale)}`;
            counts.set(k, (counts.get(k) ?? 0) + 1);
        }
    }
    const levels = subset.map((sale) =>
        dims.map((dim) => {
            const level = keyOf(dim, sale);
            return (counts.get(`${dim}\u0001${level}`) ?? 0) >= MIN_LEVEL_N ? level : `(长尾·${dim})`;
        }),
    );

    const coef = new Map<string, number>();
    const at = (dim: Dim, level: string): number => coef.get(`${dim}\u0001${level}`) ?? 0;

    for (let pass = 0; pass < 24; pass++) {
        for (let i = 0; i < dims.length; i++) {
            const dim = dims[i];
            const buckets = new Map<string, number[]>();
            for (let r = 0; r < levels.length; r++) {
                let rest = y[r];
                for (let j = 0; j < dims.length; j++) if (j !== i) rest -= at(dims[j], levels[r][j]);
                const level = levels[r][i];
                const bucket = buckets.get(level);
                if (bucket) bucket.push(rest);
                else buckets.set(level, [rest]);
            }
            for (const [level, values] of buckets) coef.set(`${dim}\u0001${level}`, median(values));
        }
    }

    const predicted = levels.map((row) => dims.reduce((sum, dim, i) => sum + at(dim, row[i]), 0));
    const dev = predicted.map((p, r) => Math.abs(y[r] - p));
    const grand = median(y.map((v) => Math.abs(v - median(y))));

    const n = new Map<string, number>();
    for (let r = 0; r < levels.length; r++) {
        for (let i = 0; i < dims.length; i++) {
            const k = `${dims[i]}\u0001${levels[r][i]}`;
            n.set(k, (n.get(k) ?? 0) + 1);
        }
    }

    return { coef, n, resid: median(dev), explain: 1 - median(dev) / grand, rows: subset.length };
}

/** 取某个层级的倍率（×N.NN 里的 N.NN） */
export const levelFactor = (fit: FitResult, dim: Dim, level: string): number => 10 ** (fit.coef.get(`${dim}\u0001${level}`) ?? 0);

/** 按自然顺序打印某个维度的一张表 */
export function printDim(title: string, fit: FitResult, dim: Dim, minN = 1): void {
    console.log(`\n### ${title}`);
    const entries = [...fit.n.entries()]
        .filter(([key]) => key.startsWith(`${dim}\u0001`))
        .map(([key, count]) => [key.slice(dim.length + 1), count] as [string, number])
        .filter(([level, count]) => level !== `(长尾·${dim})` && count >= minN);
    const order = DIM_ORDER[dim];
    entries.sort((a, b) => (order.length > 0 ? order.indexOf(a[0]) - order.indexOf(b[0]) : b[1] - a[1]));
    for (const [level, count] of entries) {
        console.log(`  ${level.padEnd(26)} ${String(count).padStart(6)} 条  系数 ×${levelFactor(fit, dim, level).toFixed(3)}`);
    }
}
