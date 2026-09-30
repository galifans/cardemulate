/**
 * 用卡淘成交样本核对**仓库里当前生效的**卡价模型。
 *
 * 用法
 * ----
 *   node scripts/check-sales-fit.ts [样本文件]
 *
 * `fit-sales-model.ts` 量的是「市场长什么样」，这个脚本比的是「模型说得对不对」：
 * 两边用同一套口径（`scripts/lib/polish.ts`），所以倍数可以直接对上。
 *
 * 为什么只比倍数，不比单张误差
 * ----------------------------
 * 成交记录里只有一串塞满关键词的中文标题，**对不到具体某一张卡上** —— 同一个标题
 * 可能指 /99 也可能指 /10。所以「这一条预测得准不准」算不出来。能算的是**维度倍数**：
 * 市场说「签字卡比普卡贵 7.9 倍」，模型也能给一个对应倍数，两者可比。
 *
 * 模型侧的倍数直接从在册卡表统计（用 cardValueBreakdown 自己算，不另写一套公式），
 * 统计范围与成交样本一致：只算在册系列。
 */
import { cardValueBreakdown } from "../src/data/prices/card-values";
import { draftFactor, draftPick, PICK_LADDER } from "../src/data/prices/draft";
import { PLAYER_TIERS_AS_OF, ROOKIE_FACTOR } from "../src/data/prices/players";
import { REGISTERED_BOXES } from "../src/data/sets";
import type { GroupKind, PulledCard, Tier } from "../src/engine/types";
import { DEFAULT_CORPUS, loadCorpus, median, polish, printBucket, printDim, skeleton } from "./lib/polish";
import type { Dim } from "./lib/polish";

const corpus = loadCorpus(process.argv[2] ?? DEFAULT_CORPUS);
if (!corpus) {
    console.error("找不到样本文件；先跑 node scripts/scrape-card-sales.mjs");
    process.exit(1);
}
const { sales, graded } = corpus;
const modern = sales.filter((sale) => sale.series !== null);

console.log("### 样本");
console.log(`  入选 ${sales.length} 条，其中能对上在册系列 ${modern.length} 条`);
console.log(`  球员档位表基准日 ${PLAYER_TIERS_AS_OF}`);

/* ------------------------------------------------------ 一、实测维度倍数 */

console.log("\n---\n");
console.log("### 一、实测维度倍数（成交样本抛光，已抵消系列 / 人物 / 卡类 / 印量）");
const fit = polish(modern, ["series", "player", "kind", "print", "rookie"]);
console.log(
    `  样本 ${fit.rows} 条，中位绝对残差 ${fit.resid.toFixed(3)} 个数量级（约 ${(10 ** fit.resid).toFixed(2)} 倍），` +
        `五维合计解释 ${(fit.explain * 100).toFixed(1)}%`,
);
printDim("卡类", fit, "kind");
printDim("印量（相对非编号的倍数）", fit, "print");
printDim("新秀", fit, "rookie");
const level = (dim: Dim, name: string): number => 10 ** (fit.coef.get(`${dim}\u0001${name}`) ?? 0);
const printMeasured = new Map<string, number>();
for (const bucket of ["/1", "/2-9", "/10-24", "/25-49", "/50-99", "/100-199", "/200-399"]) {
    if (fit.n.has(`print\u0001${bucket}`)) printMeasured.set(bucket, level("print", bucket) / level("print", "非编号"));
}

/* ------------------------------------------------------ 二、模型隐含倍数 */

console.log("\n---\n");
console.log("### 二、模型隐含的维度倍数（在册卡表统计，口径与上面一致）");

/**
 * 各印量档的代表编号 —— 取档位上界，与 scarcityFactor 的断点对齐。
 * 用代表编号而不是真实编号，是为了让「/50-99 平均贵多少」这格有唯一口径。
 */
const BUCKET_NUMBERED: Record<string, number | null> = {
    非编号: null,
    "/1": 1,
    "/2-9": 9,
    "/10-24": 24,
    "/25-49": 49,
    "/50-99": 99,
    "/100-199": 199,
    "/200-399": 399,
    "/400+": 400,
};
const BUCKETS = Object.keys(BUCKET_NUMBERED);

/** (系列 × 卡类 × 印量档) 里各档位卡种的数量 */
const cells = new Map<string, Map<Tier, number>>();
for (const box of REGISTERED_BOXES) {
    for (const variant of box.variants) {
        const bucket = variant.numbered === null ? "非编号" : printBucket(variant.numbered);
        const key = `${box.productKey}\u0001${variant.group}\u0001${bucket}`;
        let cell = cells.get(key);
        if (!cell) {
            cell = new Map();
            cells.set(key, cell);
        }
        cell.set(variant.tier, (cell.get(variant.tier) ?? 0) + 1);
    }
}

const probe = (group: GroupKind, tier: Tier, numbered: number | null): PulledCard =>
    ({ group, tier, player: "＿＿", numbered, serial: null, rookie: false }) as PulledCard;

/** 某格（系列 × 卡类 × 印量档）的平均单卡价：只随档位与限量变，不含人物 */
const cellPrice = (productKey: string, group: GroupKind, bucket: string): { value: number; n: number } => {
    const cell = cells.get(`${productKey}\u0001${group}\u0001${bucket}`);
    if (!cell) return { value: 0, n: 0 };
    let total = 0;
    let n = 0;
    for (const [tier, count] of cell) {
        total += cardValueBreakdown(probe(group, tier, BUCKET_NUMBERED[bucket]), productKey).value * count;
        n += count;
    }
    return { value: n === 0 ? 0 : total / n, n };
};

/** 全在册系列的加权平均，得出模型给出的卡类倍数 */
const kindAverages = new Map<GroupKind, { total: number; n: number }>();
for (const box of REGISTERED_BOXES) {
    for (const group of ["base", "auto", "relic", "ssp"] as GroupKind[]) {
        const plain = cellPrice(box.productKey, group, "非编号");
        if (plain.n === 0) continue;
        const slot = kindAverages.get(group) ?? { total: 0, n: 0 };
        slot.total += plain.value * plain.n;
        slot.n += plain.n;
        kindAverages.set(group, slot);
    }
}
const modelKind = (group: GroupKind): number => {
    const slot = kindAverages.get(group);
    return slot && slot.n > 0 ? slot.total / slot.n : 0;
};
console.log("\n  卡类倍数（相对普卡）：");
const kindRows: [string, GroupKind, number][] = [
    ["签字卡 ÷ 普卡", "auto", level("kind", "auto") / level("kind", "base")],
    ["实物卡 ÷ 普卡", "relic", level("kind", "relic") / level("kind", "base")],
    ["超短印 ÷ 普卡", "ssp", level("kind", "ssp") / level("kind", "base")],
];
for (const [label, group, measured] of kindRows) {
    const model = modelKind(group) / modelKind("base");
    console.log(`    ${label.padEnd(16)} 实测 ×${measured.toFixed(2)}   模型 ×${model.toFixed(2)}   模型 ÷ 实测 ×${(model / measured).toFixed(2)}`);
}

console.log("\n  印量倍数（相对非编号，跨全部在册系列取中位）：");
console.log(`    ${"档位".padEnd(12)}${"实测".padStart(10)}${"模型".padStart(10)}   模型 ÷ 实测`);
const printModel = new Map<string, number[]>();
for (const box of REGISTERED_BOXES) {
    for (const group of ["base", "auto", "ssp"] as GroupKind[]) {
        const plain = cellPrice(box.productKey, group, "非编号");
        if (plain.n === 0) continue;
        for (const bucket of BUCKETS) {
            if (bucket === "非编号") continue;
            const cell = cellPrice(box.productKey, group, bucket);
            if (cell.n < 3) continue;
            const values = printModel.get(bucket) ?? [];
            values.push(cell.value / plain.value);
            printModel.set(bucket, values);
        }
    }
}
for (const [bucket, measured] of printMeasured) {
    const values = printModel.get(bucket);
    if (!values || values.length === 0) continue;
    const model = median(values);
    console.log(`    ${bucket.padEnd(12)}×${measured.toFixed(2).padStart(9)}×${model.toFixed(2).padStart(9)}   ×${(model / measured).toFixed(2)}`);
}
console.log("    读法：这一列以「非编号」为 1，而模型的非编号普卡是**故意低于成交中位**的");
console.log("    （理由与第四节相同：挂出来卖的都是有人要的球员），所以低编号那几档的");
console.log("    模型 ÷ 实测天生偏小，不能照这一列把 /2-9 的 scarcityFactor 调回去。");
console.log("    判单张对不对，要在**同一个球员、同一个系列**下逐格比 —— 两边锚在同一个人身上，");
console.log("    那时 /1 与 /2-9 都落在 ×0.8~×1.2，而只有非编号那一格偏低。");

/* ---------------------------------------------------------- 三、维度覆盖 */

console.log("\n---\n");
console.log("### 三、新维度的落地覆盖");
const draftees = new Set<string>();
for (const sale of modern) if (sale.player !== null && draftPick(sale.player) !== null) draftees.add(skeleton(sale.player));
const gradedDraftees = [...draftees].filter((name) => graded.has(name));
console.log(`  样本里出现的当届新秀 ${draftees.size} 人，其中已进档位表 ${gradedDraftees.length} 人`);
console.log(`  剩下 ${draftees.size - gradedDraftees.length} 人由顺位阶梯计价，阶梯共 ${PICK_LADDER.length} 档`);
console.log(`  顺位阶梯的倍率范围 ×${Math.max(...PICK_LADDER.map((step) => step.factor))} ~ ×${Math.min(...PICK_LADDER.map((step) => step.factor))}`);
console.log(`  未进当届名单的球员一律 ×${draftFactor("Rudy Gobert")}`);
console.log(`  新秀系数 ROOKIE_FACTOR = ×${ROOKIE_FACTOR}，实测新秀 ÷ 非新秀 = ×${(level("rookie", "新秀") / level("rookie", "非新秀")).toFixed(3)}`);

/* ---------------------------------------------------------- 四、系列量级 */

console.log("\n---\n");
console.log("### 四、各系列的量级对照（普卡 · 非编号）");
console.log("  这一节**只能抓数量级错误，不能用来定系列系数**，两重偏差叠在一起：");
console.log("  一是档位混比 —— 成交侧的中位价来自挂牌分布（挂得最多的是谁都能挂的普通卡），");
console.log("  模型侧是卡表里各档位的加权平均，系列之间档位混比还不一样；");
console.log("  二是人物选择 —— 挂出来卖的都是有人要的球员，模型侧的均卡是「普通轮换球员」。");
console.log("  所以模型侧系统性低于成交中位是正常的，只有差到十倍以上才是真错。");
console.log(`\n  ${"系列".padEnd(24)}${"成交中位".padStart(10)}${"模型均卡".padStart(10)}   倍比`);
const seriesRows: [string, number, number][] = [];
for (const box of REGISTERED_BOXES) {
    if (seriesRows.some(([key]) => key === box.productKey)) continue;
    const prices = modern
        .filter((sale) => sale.series === box.productKey && sale.kind === "base" && sale.numbered === null)
        .map((sale) => sale.price);
    const model = cellPrice(box.productKey, "base", "非编号");
    if (prices.length < 30 || model.n === 0) continue;
    const observed = median(prices);
    seriesRows.push([box.productKey, observed, model.value]);
    console.log(`  ${box.productKey.padEnd(24)}${`¥${observed.toFixed(0)}`.padStart(10)}${`¥${model.value.toFixed(0)}`.padStart(10)}   ×${(model.value / observed).toFixed(2)}`);
}
const seriesRatios = seriesRows.map(([, observed, model]) => model / observed);
console.log(`  倍比中位 ×${median(seriesRatios).toFixed(2)}，区间 ×${Math.min(...seriesRatios).toFixed(2)} ~ ×${Math.max(...seriesRatios).toFixed(2)}`);

/* -------------------------------------------------------------- 五、结论 */

const failures: string[] = [];
const rookieRatio = level("rookie", "新秀") / level("rookie", "非新秀");
if (ROOKIE_FACTOR < rookieRatio / 1.5 || ROOKIE_FACTOR > rookieRatio * 1.5) {
    failures.push(`新秀系数 ×${ROOKIE_FACTOR} 与实测 ×${rookieRatio.toFixed(3)} 相差超过 1.5 倍`);
}
for (const [label, group, measured] of kindRows) {
    const ratio = modelKind(group) / modelKind("base") / measured;
    if (ratio < 1 / 2 || ratio > 2) failures.push(`${label} 模型与实测相差 ×${ratio.toFixed(2)}`);
}
for (const [key, observed, model] of seriesRows) {
    const ratio = model / observed;
    if (ratio < 1 / 8 || ratio > 8) failures.push(`${key} 的普卡量级与成交中位相差 ×${ratio.toFixed(2)}`);
}

console.log("\n---\n");
if (failures.length === 0) {
    console.log("模型维度核对通过。");
} else {
    console.log("模型维度核对有问题：");
    for (const line of failures) console.log(`  [!] ${line}`);
}
console.log("\n※ 成交记录对不到具体某一张卡，所以这里只能比维度倍数，比不了单张误差；");
console.log("  单张口径的误差见 fit-sales-model.ts 的留出集那一节。");
