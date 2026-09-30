/**
 * 用卡淘成交样本量出**每个球员自己的倍率**，写进
 * `src/data/prices/player-factors.generated.ts`。
 *
 * 用法
 * ----
 *   node scripts/import-player-factors.ts [样本文件]
 *
 * 量的是什么
 * ----------
 * 把 `log10(成交价)` 按（系列 / 球员 / 印量 / 新秀）抛光，取每个球员那一层的系数，
 * 再除以「(未识别球员)」那一层 —— 于是 **1.0 = 卡淘上一张认不出主角的卡的价位**，
 * 与模型里 `playerTier()` 返回 1 的「未列入」是同一个参照点。
 *
 * 为什么按卡类分开量
 * ------------------
 * 同一批 2025 届新秀，普卡口径的倍率是 ×1–5，签字卡口径是 ×6–75，差一个数量级。
 * 合成一个数字两边都会错：按普卡口径做，球星签字卡只剩 1/5；按签字卡口径做，
 * 普卡又翻好几倍。所以表里每个球员存两个数，模型按卡的大类挑一个用。
 *
 * 为什么比梯队表好
 * ----------------
 * 梯队表把球员归成几档、一档给一个数字，归得对不对看不出来 —— 同一个「巨星」档里
 * 实测签字卡倍率从 ×6.3（贝利）到 ×33.4（哈珀）差了 5 倍。量得到就直接用测出来的数，
 * 量不到才回梯队表（见 `players.ts`）。
 *
 * 两个门槛
 * --------
 * 签字卡 ≥12 条、普卡 ≥20 条才算量到。少于此的层级在抛光里会被并进「(长尾·球员)」，
 * 放进来只会把一条记录的价格当成一个球员的身价。
 */
import { writeFileSync } from "node:fs";

import { DEFAULT_CORPUS, levelFactor, loadCorpus, polish } from "./lib/polish";
import type { Dim, FitResult } from "./lib/polish";

/** 量到球员所需的最少条数 */
const AUTO_MIN = 12;
const PLAIN_MIN = 20;

/** 抛光维度：与模型自身的自变量对齐，缺一个就会把这一个维度的差异算进球员身价 */
const DIMS: Dim[] = ["series", "player", "print", "rookie"];

const corpusPath = process.argv[2] ?? DEFAULT_CORPUS;
const corpus = loadCorpus(corpusPath);
if (!corpus) {
    console.error(`找不到样本文件 ${corpusPath}；先跑 node scripts/scrape-card-sales.mjs`);
    process.exit(1);
}

const modern = corpus.sales.filter((sale) => sale.series !== null);
const autoFit = polish(
    modern.filter((sale) => sale.kind === "auto"),
    DIMS,
);
const plainFit = polish(
    modern.filter((sale) => sale.kind === "base"),
    DIMS,
);

const ANCHOR = "(未识别球员)";
/** 相对「未识别球员」的倍率 */
const relative = (fit: FitResult, player: string): number => levelFactor(fit, "player", player) / levelFactor(fit, "player", ANCHOR);
const rows = (fit: FitResult, player: string): number => fit.n.get(`player\u0001${player}`) ?? 0;

interface Row {
    player: string;
    premium: number;
    plain: number;
    autoRows: number;
    plainRows: number;
}

const names = [...new Set([...autoFit.n.keys(), ...plainFit.n.keys()].filter((key) => key.startsWith("player\u0001")).map((key) => key.slice("player\u0001".length)))].filter(
    (name) => !name.startsWith("("),
);

const rows_: Row[] = [];
for (const player of names.sort()) {
    const autoN = rows(autoFit, player);
    const plainN = rows(plainFit, player);
    if (autoN < AUTO_MIN || plainN < PLAIN_MIN) continue;
    rows_.push({
        player,
        premium: Number(relative(autoFit, player).toFixed(3)),
        plain: Number(relative(plainFit, player).toFixed(3)),
        autoRows: autoN,
        plainRows: plainN,
    });
}
rows_.sort((a, b) => b.premium - a.premium);

/* ------------------------------------------------------------------ 报告 */

console.log("### 样本");
console.log(`  ${corpusPath}`);
console.log(`  在册系列（现代卡）${modern.length} 条，其中签字卡 ${autoFit.rows} 条、普卡 ${plainFit.rows} 条`);
console.log(`  签字卡口径中位绝对残差 ${autoFit.resid.toFixed(3)}，普卡口径 ${plainFit.resid.toFixed(3)}（数量级）`);
console.log(`  两个口径的「未识别球员」相对水位：签字卡 ×${levelFactor(autoFit, "player", ANCHOR).toFixed(3)} / 普卡 ×${levelFactor(plainFit, "player", ANCHOR).toFixed(3)}`);

console.log("\n### 量到的球员");
console.log(`  签字卡 ≥${AUTO_MIN} 条且普卡 ≥${PLAIN_MIN} 条的共 ${rows_.length} 人`);
for (const row of rows_) {
    const mark = corpus.graded.has(row.player.toLowerCase()) ? "●" : " ";
    console.log(
        `   ${mark}${row.player.padEnd(24)} 签字 ×${String(row.premium).padStart(8)} (${String(row.autoRows).padStart(3)})` +
            `  普卡 ×${String(row.plain).padStart(7)} (${String(row.plainRows).padStart(3)})`,
    );
}

const dropped = names
    .filter((player) => rows(autoFit, player) >= 3 && rows(autoFit, player) < AUTO_MIN)
    .sort((a, b) => rows(autoFit, b) - rows(autoFit, a))
    .slice(0, 12);
console.log(`\n### 差一口气的（签字卡 3~${AUTO_MIN - 1} 条，回梯队表）`);
console.log(`  ${dropped.map((player) => `${player} ${rows(autoFit, player)}`).join(" | ")}`);

const odd = rows_.filter((row) => row.premium < 0.2 || row.premium > 200);
if (odd.length > 0) console.log(`\n### 倍率在 [0.2, 200] 之外的（核一遍是不是同名不同人）\n  ${odd.map((row) => `${row.player} ×${row.premium}`).join(" | ")}`);

/* ------------------------------------------------------------------ 落盘 */

const body = rows_
    .map((row) => `    ${JSON.stringify(row.player)}: { premium: ${row.premium}, plain: ${row.plain}, autoRows: ${row.autoRows}, plainRows: ${row.plainRows} },`)
    .join("\n");

const file = `/**
 * 量出来的球员倍率 —— 每个球员自己一条，不再归到某个梯队。
 *
 * **自动生成，不要手改。** 由 \`node scripts/import-player-factors.ts\` 从
 * \`.snapshot/card-sales.jsonl\`（卡淘成交样本）生成；采样口径与复现步骤见 PROGRESS.md。
 *
 * 1.0 是什么
 * ----------
 * 两个口径各自以「(未识别球员)」为 1.0，也就是**卡淘上一张认不出主角的卡的价位**。
 * 这与模型里 \`playerTier()\` 返回 1 的「未列入档位表」是同一个参照点，所以这张表
 * 可以直接替代梯队倍率，不需要再乘任何校正。\`premium\` 用于签名卡 / 实物卡 / 超短印，
 * \`plain\` 用于普卡 / 平行卡 / 插入卡 —— 同一球员两个口径能差一个数量级，见脚本注释。
 *
 * 没量到的球员
 * ------------
 * 这张表不是全集：签字卡不足 ${AUTO_MIN} 条或普卡不足 ${PLAIN_MIN} 条的球员这里没有，
 * 由 \`players.ts\` 的梯队表兜底。表内球员的倍率一律以实测为准，梯队表不再参与。
 */

/** 量出这张表时样本截止的日期 */
export const PLAYER_FACTORS_AS_OF = "2026-10-01";

export interface PlayerFactor {
    /** 签名卡 / 实物卡 / 超短印卡用的倍率 */
    premium: number;
    /** 普卡 / 平行卡 / 插入卡用的倍率 */
    plain: number;
    /** 量这两个数各用了多少条成交（0 = 没量到，不会出现在表里） */
    autoRows: number;
    plainRows: number;
}

export const PLAYER_FACTORS: Readonly<Record<string, PlayerFactor>> = {
${body}
};
`;

writeFileSync("src/data/prices/player-factors.generated.ts", file);
console.log("\n写出 src/data/prices/player-factors.generated.ts");
