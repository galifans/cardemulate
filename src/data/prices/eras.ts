/**
 * 年份 / 时代 —— 卡价模型里唯一「按日期冻结」的维度。
 *
 * 为什么是冻结的表而不是读时钟
 * ----------------------------
 * 「越近年份的选秀价格越高」这个直觉只对了一半。成交样本抛光掉系列、人物、卡类、
 * 印量、新秀五个维度之后，年份这一栏不是单调的，也不是一条开口向上的 U 型曲线：
 * 峰值落在 1996–2009（怀旧资产重估），2019–24 反而一路走低，2025–26 回升。
 * 无论结论是哪一种，它都是**某一天**的市场状态，所以这张表必须带日期出场，
 * 不能写成一个随时间漂移的公式 —— 卡价模型要保持纯函数，同一个种子重算必须同价。
 *
 * 口径
 * ----
 * 表里的数是实测系数除以 2025 年那一档（÷1.133），让 2025 赛季 = 1.00；
 * 在册产品全部是 2025-26 赛季，落到 2025 那一档，所以本表当前不影响任何报价，
 * 是给将来加入老系列时用的。实测原始值与样本量记在下面每一行的注释里。
 *
 * 能查到与查不到的
 * ----------------
 * 「成品卡溢价」「分级决定流动性（PSA 10 与 9 差数倍）」这两个真的存在的效应，
 * 本模型表达不了：成交标题里对不到具体某一张卡，卡淘也不提供分级筛选项。
 * 详见 sources/prices/README.md 的「测不到的部分」。
 */

/** 时代系数所依据的成交样本截止日 */
export const ERA_FACTOR_AS_OF = "2026-10-01";

/** 年 -> 时代标签。断点与 scripts/lib/polish.ts 的 eraOf 必须一致 */
export function eraOfYear(year: number | null): string {
    if (year === null) return "未知";
    if (year <= 1995) return "≤1995";
    if (year <= 1999) return "1996–99";
    if (year <= 2004) return "2000–04";
    if (year <= 2009) return "2005–09";
    if (year <= 2018) return "2010–18";
    if (year <= 2021) return "2019–21";
    if (year <= 2023) return "2022–23";
    if (year === 2024) return "2024";
    if (year === 2025) return "2025";
    if (year === 2026) return "2026";
    return "未知";
}

/** 时代系数表。factor 是相对 2025 档的倍数，n 是标定用到的成交条数 */
export const ERA_FACTORS: { era: string; factor: number; n: number }[] = [
    { era: "≤1995", factor: 1.108, n: 111 },   // 实测 ×1.255
    { era: "1996–99", factor: 2.266, n: 131 }, // 实测 ×2.567
    { era: "2000–04", factor: 2.014, n: 58 },  // 实测 ×2.282
    { era: "2005–09", factor: 1.805, n: 88 },  // 实测 ×2.045
    { era: "2010–18", factor: 1.176, n: 216 }, // 实测 ×1.332
    { era: "2019–21", factor: 0.923, n: 488 }, // 实测 ×1.046
    { era: "2022–23", factor: 0.698, n: 1011 },// 实测 ×0.791
    { era: "2024", factor: 0.586, n: 975 },    // 实测 ×0.664
    { era: "2025", factor: 1, n: 10500 },      // 实测 ×1.133，作为 1.00 的锚
    { era: "2026", factor: 0.809, n: 8391 },   // 实测 ×0.917
];

const BY_ERA = new Map<string, number>(ERA_FACTORS.map((row) => [row.era, row.factor]));

/**
 * 从赛季标签里取起始年：`"2025-26"` → 2025。
 *
 * 盒型定义里的 year 是赛季而不是日历年（在册八个系列全是 `"2025-26"`），
 * 所以这里取前四位。取不到数字就返回 null，落到「未知」那一档。
 */
export function seasonStartYear(season: string): number | null {
    const match = /(\d{4})/.exec(season);
    return match ? Number(match[1]) : null;
}

/**
 * 时代倍率。表里查不到（含年份为空、年份写错）一律 1 倍。
 *
 * 「未知」那一档实测是 ×0.607，但那是样本里的口径，不能拿来给一个年份写错的盒型
 * 打六折 —— 宁可不动价。
 */
export function eraFactor(year: number | null): number {
    if (year === null) return 1;
    return BY_ERA.get(eraOfYear(year)) ?? 1;
}
