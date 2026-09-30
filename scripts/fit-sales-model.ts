/**
 * 用卡淘成交样本重标定卡价模型的各维度系数（只量，不改仓库常数）。
 *
 * 用法
 * ----
 *   node scripts/fit-sales-model.ts [样本文件] [球员最小样本量]
 *
 * 装载、分档、抛光都在 `scripts/lib/polish.ts` 里，这个文件只负责**怎么切维度**。
 * `check-sales-fit.ts` 用同一份库，把这里量出来的数跟仓库里生效的常数对起来。
 *
 * 为什么切成几个独立的拟合
 * ------------------------
 * 一个模型里同时放两组互相决定的自变量，抛出来的系数两边都读不出真值。本项目撞上的：
 *
 *   - 系列 × 年代：在册的 8 个系列全是 2025-26 赛季，年代维度分不开系列维度。
 *     合在一起会得到「1996-2004 年的 Topps Finest 值 5 倍」这种把两件事搅在一起的数。
 *     → 年代单独拟合，去掉系列维度。
 *   - 人物 × 顺位：顺位是球员的固有属性，同一个球员的每张卡都吃同一个顺位系数。
 *     而档位表里已经有一批球员（也就是已经计过一次价了）。
 *     → 顺位只在**未进档位表**的球员上拟合，避免同一件事计两遍。
 *   - 新秀 ×（人物 × 顺位）：新秀标志与「2025 届新秀」高度重合。
 *     → 新秀系数按卡类拆开单独看一遍。
 *
 * 为什么必须留出集
 * ----------------
 * 样本内残差只能说明「这套系数拟合了这批数据」。留出集才回答用户真正问的问题：
 * 换一张没见过的卡，模型差多少。没有这个数就不能说「模型准」。
 *
 * 为什么全用中位数：样本里有 ￥10,000,000 这种占位挂牌和大量尾货，均值会被单条记录带跑。
 */
import { DEFAULT_CORPUS, eraOf, loadCorpus, median, polish, printBucket, printDim, skeleton } from "./lib/polish";
import type { Dim, FitResult, Sale } from "./lib/polish";

const corpusPath = process.argv[2] ?? DEFAULT_CORPUS;
const playerMinN = Number(process.argv[3] ?? 25);

const corpus = loadCorpus(corpusPath);
if (!corpus) {
    console.error(`找不到样本文件 ${corpusPath}；先跑 node scripts/scrape-card-sales.mjs`);
    process.exit(1);
}
const { sales, graded } = corpus;

const modern = sales.filter((sale) => sale.series !== null);
const autos = modern.filter((sale) => sale.kind === "auto");
const pct = (fit: FitResult, dim: Dim, level: string): number => 10 ** (fit.coef.get(`${dim}\u0001${level}`) ?? 0);

console.log("### 样本");
console.log(`  入选 ${sales.length} 条（出价 ≥2，剔除整盒整包 / 多张打包 / 评级卡）`);
const dates = sales.map((sale) => sale.soldAt).filter(Boolean).sort();
console.log(`  成交时间 ${dates[0]} ~ ${dates[dates.length - 1]}`);
console.log(`  可对到选秀顺位的 ${sales.filter((sale) => sale.pick !== null).length} 条`);

/* ------------------------------------------------------------ 一、在册系列 */

console.log("\n---\n");
console.log("### 一、在册系列样本（现代卡）");
const fitA = polish(modern, ["series", "player", "kind", "print", "rookie"]);
console.log(
    `  样本 ${fitA.rows} 条，中位绝对残差 ${fitA.resid.toFixed(3)} 个数量级（约 ${(10 ** fitA.resid).toFixed(2)} 倍），` +
        `五维合计解释 ${(fitA.explain * 100).toFixed(1)}%`,
);
printDim("系列系数（已抵消球员 / 卡类 / 印量）", fitA, "series");
printDim("卡类系数（已抵消系列 / 球员 / 印量）", fitA, "kind");
printDim("印量系数（已抵消系列 / 球员 / 卡类）", fitA, "print");
printDim("新秀系数（已抵消系列 / 球员 / 卡类 / 印量）", fitA, "rookie");

/* -------------------------------------------------------- 二、新秀拆卡类 */

console.log("\n---\n");
console.log("### 二、新秀系数按卡类拆开");
console.log("  新秀标志与 2025 届新秀高度重合，整体拟合里的「新秀」可能被别的维度吃掉了；");
console.log("  分卡类各拟合一遍，看这个系数在各类卡里是不是长得一样。");
for (const kind of ["base", "auto", "relic", "ssp"] as const) {
    const slice = modern.filter((sale) => sale.kind === kind);
    if (slice.length < 200) continue;
    const fit = polish(slice, ["series", "player", "print", "rookie"]);
    const rookies = slice.filter((sale) => sale.rookie).length;
    console.log(
        `  ${kind.padEnd(6)} 新秀 ${String(rookies).padStart(5)} / 非新秀 ${String(slice.length - rookies).padStart(5)}` +
            `  新秀 ÷ 非新秀 = ×${(pct(fit, "rookie", "新秀") / pct(fit, "rookie", "非新秀")).toFixed(3)}`,
    );
}

/* -------------------------------------------------------------- 三、年代 */

console.log("\n---\n");
console.log("### 三、年代系数（不带系列维度，见文件头的共线说明）");
const fitC = polish(sales, ["player", "kind", "print", "rookie", "era"]);
console.log(`  样本 ${fitC.rows} 条（全部），中位绝对残差 ${fitC.resid.toFixed(3)}`);
printDim("年代系数（已抵消球员 / 卡类 / 印量 / 新秀）", fitC, "era");

/* -------------------------------------------------- 四、球员（全卡类口径）*/

console.log("\n---\n");
console.log(`### 四、球员系数 —— 全卡类口径（样本 ≥${playerMinN}）`);
const fitD = polish(modern, ["series", "kind", "print", "rookie", "player"]);
printDim("球员系数（已抵消系列 / 卡类 / 印量 / 新秀）", fitD, "player", playerMinN);

/* --------------------------------------------------- 五、球员（签字卡口径）*/

console.log("\n---\n");
console.log("### 五、球员系数 —— 只看签字卡（球员实测表该对的口径）");
const fitE = polish(autos, ["series", "player", "print"]);
console.log(`  签字卡样本 ${fitE.rows} 条，中位绝对残差 ${fitE.resid.toFixed(3)} 个数量级`);
const autoPlayers = [...fitE.n.entries()]
    .filter(([key, count]) => key.startsWith("player\u0001") && count >= 8 && !key.includes("("))
    .map(([key]) => key.slice("player\u0001".length))
    .sort((a, b) => pct(fitE, "player", b) - pct(fitE, "player", a));
console.log(`  按倍率排序（● = 也在粗档位表里，那张表现在只当兜底）共 ${autoPlayers.length} 人：`);
for (const player of autoPlayers) {
    const mark = graded.has(skeleton(player)) ? "●" : " ";
    console.log(`   ${mark}${player.padEnd(24)} ${String(fitE.n.get(`player\u0001${player}`)).padStart(4)} 条  ×${pct(fitE, "player", player).toFixed(3)}`);
}

/* -------------------------------------------------------------- 六、顺位 */

console.log("\n---\n");
console.log("### 六、顺位系数（只统计未进档位表的球员，避免与档位重复计价）");
const ungraded = modern.filter((sale) => sale.player !== null && !graded.has(skeleton(sale.player!)));
const fitF = polish(ungraded, ["series", "kind", "print", "pick"]);
console.log(`  样本 ${fitF.rows} 条，中位绝对残差 ${fitF.resid.toFixed(3)}`);
printDim("顺位系数（已抵消系列 / 卡类 / 印量）", fitF, "pick");
console.log("  ※ 状元档常常没有独立行 —— 状元一年只有一个，样本量天然不够");

/* ---------------------------------------------------------- 七、格子中位价 */

console.log("\n---\n");
console.log("### 七、格子中位价（原始中位价，不是系数）");
console.log("  系数是相对量，落不到「这张卡到底值多少钱」上。这一节把样本最厚的两个系列");
console.log("  按（卡类 × 印量）切成格子直接给中位价 —— 标定 BASELINE 时对着它看偏差。");
for (const series of ["tcu26-basketball", "thoops26-basketball"]) {
    console.log(`\n  【${series}】`);
    for (const kind of ["base", "auto", "ssp"] as const) {
        const slice = modern.filter((sale) => sale.series === series && sale.kind === kind);
        if (slice.length < 10) continue;
        const buckets = ["/1", "/2-9", "/10-24", "/25-49", "/50-99", "/100-199", "/200-399", "非编号"];
        const parts: string[] = [];
        for (const bucket of buckets) {
            const values = slice.filter((sale) => (sale.numbered === null ? "非编号" : printBucket(sale.numbered)) === bucket).map((sale) => sale.price);
            if (values.length >= 5) parts.push(`${bucket} n=${values.length} ¥${Math.round(median(values))}`);
        }
        console.log(`    ${kind.padEnd(6)} ${parts.length > 0 ? parts.join(" | ") : "样本不足"}`);
    }
}

/* ------------------------------------------------------------ 八、留出集 */

console.log("\n---\n");
console.log("### 八、样本外误差（7:3 留出集）");
const DIMS: Dim[] = ["series", "player", "kind", "print", "rookie"];
const byPrice = [...modern].sort((a, b) => a.price - b.price);
const train = byPrice.filter((_, i) => i % 10 < 7);
const held = byPrice.filter((_, i) => i % 10 >= 7);
const trainFit = polish(train, DIMS);
const keyOfSale = (dim: Dim, sale: Sale): string => {
    switch (dim) {
        case "series":
            return sale.series ?? "(未识别系列)";
        case "player":
            return sale.player ?? "(未识别球员)";
        case "kind":
            return sale.kind;
        case "print":
            return sale.numbered === null ? "非编号" : printBucket(sale.numbered);
        case "rookie":
            return sale.rookie ? "新秀" : "非新秀";
        case "era":
            return eraOf(sale.year);
        case "pick":
            return "";
    }
};
const known = new Set<string>();
for (const sale of train) {
    for (const dim of DIMS) {
        const level = `${dim}\u0001${keyOfSale(dim, sale)}`;
        if ((trainFit.n.get(level) ?? 0) >= 12) known.add(level);
    }
}
const errors: number[] = [];
let unseen = 0;
for (const sale of held) {
    let factor = 1;
    let unknown = false;
    for (const dim of DIMS) {
        const level = `${dim}\u0001${keyOfSale(dim, sale)}`;
        if (!known.has(level)) {
            unknown = true;
            factor *= 10 ** (trainFit.coef.get(`${dim}\u0001(长尾·${dim})`) ?? 0);
        } else {
            factor *= 10 ** (trainFit.coef.get(level) ?? 0);
        }
    }
    if (unknown) unseen++;
    /*
     * 这里不能乘任何「基准价」。抛光的系数是在 log10(成交价) 的绝对刻度上解出来的
     * （见 lib/polish.ts 的 predicted），10 ** Σ系数 本身就是预测价（元）。
     * 曾经写成 `24 * factor`，等于给每一行的误差凭空加上 log10(24) = 1.380 个数量级 ——
     * 「留出集中位绝对误差 1.383」里几乎全部是这个常数，不是模型的错。
     */
    errors.push(Math.abs(Math.log10(sale.price / factor)));
}
const level = (p: number): number => {
    const sorted = [...errors].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};
console.log(`  训练 ${train.length} 条，留出 ${held.length} 条`);
console.log(`  留出集中位绝对误差 ${median(errors).toFixed(3)} 个数量级 = 约 ${(10 ** median(errors)).toFixed(2)} 倍`);
console.log(`  八成样本误差在 ${(10 ** level(0.8)).toFixed(2)} 倍以内`);
console.log(`  有 ${unseen} 条（${((unseen / held.length) * 100).toFixed(1)}%）落在训练集没见过的层级上`);
