/**
 * 印量恒等式核对：官方配率表里每一行的「张数 × 编号 × 配率」应当落在同一个包数上。
 *
 * 张数与编号从盒型定义取（子集的球员数 × 平行编号），配率取官方表的原值
 * （残差那一条是 0，跳过）。官方表本身有取整与个别笔误，所以这个脚本**只报告**，
 * 不判定失败：同一批平行里算出来的包数应当聚在一起，散得太开的会在行尾标出来。
 *
 * 用法：npm run print:check            （全部系列）
 *      npm run print:check -- tsig26  （只看某个系列）
 */
import { REGISTERED_BOXES } from "../src/data/sets";

/** 偏离中位数多少算散：官方表取整后会有一成左右的抖动，超过这个数就是真的对不上 */
const TOLERANCE = 0.15;

const filter = process.argv[2] ?? "";

const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const round = (value: number): string => Math.round(value).toLocaleString("en-US");

let boxes = 0;
let subsets = 0;
let checked = 0;
let outliers = 0;

for (const box of REGISTERED_BOXES) {
    if (!box.key.includes(filter)) continue;
    boxes += 1;

    const weightSum = box.variants.reduce((sum, variant) => sum + variant.weight, 0);
    const gap = (weightSum / box.cardsPerPack - 1) * 100;

    console.log(`\n### ${box.key}`);
    console.log(
        `    每包 ${box.cardsPerPack} 张（${box.packsPerBox} 包 / 盒）；` +
            `权重合计 ${weightSum.toFixed(4)}` +
            (Math.abs(gap) < 0.01 ? "（与每包张数一致）" : `（比每包张数多 ${gap.toFixed(1)}%）`),
    );

    for (const subset of box.subsets) {
        const count = subset.subjects.length;
        if (!count) continue;
        const variants = box.variants.filter((variant) => variant.subset === subset.key);
        const samples = variants
            .filter((variant) => variant.odds > 0 && (variant.numbered ?? 0) > 0)
            .map((variant) => ({
                name: variant.variantName || "（普通版）",
                numbered: variant.numbered as number,
                odds: variant.odds,
                runs: count * (variant.numbered as number) * variant.odds,
            }));
        if (samples.length < 2) continue;

        subsets += 1;
        checked += samples.length;
        const middle = median(samples.map((sample) => sample.runs));
        const off = samples.filter((sample) => Math.abs(sample.runs / middle - 1) > TOLERANCE);
        outliers += off.length;

        console.log(
            `    ${subset.name}（${count} 张）：${samples.length} 档，包数中位数 ` +
                `${round(middle)}，区间 ${round(Math.min(...samples.map((s) => s.runs)))}–` +
                `${round(Math.max(...samples.map((s) => s.runs)))}`,
        );
        for (const sample of off) {
            console.log(
                `        偏离 ${((sample.runs / middle - 1) * 100).toFixed(0)}%：` +
                    `${sample.name} /${sample.numbered} 1:${sample.odds} → ${round(sample.runs)} 包`,
            );
        }
    }
}

console.log(
    `\n核对 ${boxes} 个盒型、${subsets} 个可核对的子集、${checked} 个档位，` +
        `偏离中位数超过 ${Math.round(TOLERANCE * 100)}% 的 ${outliers} 个。`,
);
