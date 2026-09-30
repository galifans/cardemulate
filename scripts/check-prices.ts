/**
 * 价格表核对：盒价是否登记齐全、球员倍率有没有量错、绝对价锚点还在不在，
 * 以及最重要的 —— 回本率是否合理。
 *
 * 前三项是硬校验（不通过就退出码 1）；回本率只做区间提醒，因为它是模型参数调出来的
 * 结果，不是一个「官方数字」，看见区间外的行就去 card-values.ts 调基准价。
 *
 * 用法：npm run prices:check            全部盒型
 *      npm run prices:check -- thoops  只看某个系列
 */
import { REGISTERED_BOXES } from "../src/data/sets";
import { ripBox } from "../src/engine/rip";
import type { GroupKind, PulledCard, VariantDef } from "../src/engine/types";
import {
    ALL_STARS,
    ELITES,
    PLAYER_TIERS_AS_OF,
    SUPERSTARS,
    TIER_EVIDENCE,
} from "../src/data/prices/players";
import { BOX_PRICES, boxPriceEntry, sumValueRmb, PRICE_SOURCES, USD_CNY } from "../src/data/prices";
import { cardValueRmb } from "../src/data/prices/card-values";

/** 每个盒型模拟多少盒：够把回本率稳到小数点后两位 */
const SAMPLES = 40;

/** 整体中位数必须落在这个区间：低了说明卡价定得太便宜，高了说明太贵 */
const MEDIAN_MIN = 0.25;
const MEDIAN_MAX = 1.0;

/** 单个盒型超出这个区间只提醒，不判定失败 —— 不同盒型的回收率本来就不一样 */
const BOX_MIN = 0.15;
const BOX_MAX = 1.3;

const filter = process.argv[2] ?? "";
const boxes = REGISTERED_BOXES.filter((box) => box.key.includes(filter));
const live = boxes.filter((box) => box.live);

let failed = 0;
let warned = 0;
const ratios: number[] = [];
const fail = (message: string): void => {
    console.log(`  [!] ${message}`);
    failed += 1;
};

const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/* ---------------------------------------------------------------- */
/* 1. 盒价登记完整性                                                  */
/* ---------------------------------------------------------------- */
console.log("### 盒价登记");

for (const box of live) {
    if (!boxPriceEntry(box.key)) fail(`${box.key} 已上线但没有登记购入价`);
}
for (const source of PRICE_SOURCES) {
    if (!source.url.startsWith("http")) fail(`来源 ${source.key} 的 url 不合法`);
}

/*
 * 官方发售价口径的行必须自洽：登记价就是从 msrpUsd 按 USD_CNY 折出来的。
 * 这一条是为了防止出现「改了美元原价忘了改 RMB 价」这种不对称修改 ——
 * 人看不出 3960 与 549.99×7.2 的关系，脚本看得出来。
 */
for (const row of BOX_PRICES) {
    if (row.basis !== "msrp") continue;
    if (row.msrpUsd === undefined) {
        fail(`${row.boxKey} 标了官方发售价口径但没有 msrpUsd`);
        continue;
    }
    const expected = Math.round(row.msrpUsd * USD_CNY);
    if (row.cost !== expected) {
        fail(`${row.boxKey} 登记价 ¥${row.cost} 与官方发售价 $${row.msrpUsd} × ${USD_CNY} = ¥${expected} 对不上`);
    }
}

const msrpCount = BOX_PRICES.filter((row) => row.basis === "msrp").length;
console.log(`  线上盒型 ${live.length} 个，已登记 ${live.filter((box) => boxPriceEntry(box.key)).length} 个`);
console.log(`  其中官方发售价口径 ${msrpCount} 个，公开零售报价口径 ${BOX_PRICES.length - msrpCount} 个`);

/* ---------------------------------------------------------------- */
/* 2. 球员分级拼写                                                    */
/* ---------------------------------------------------------------- */
console.log("\n### 球员分级");

const roster = new Set<string>();
for (const box of REGISTERED_BOXES) {
    for (const subset of box.subsets) {
        for (const subject of subset.subjects) roster.add(subject.player);
    }
}

/*
 * 名册里的名字是从官方 checklist 抄来的，同一个球员各系列写法不一：
 * 「Alperun Sengun」「Egor Dëmin」「Bennedict mathurin」都出现过。
 * 所以比对前先归一化，只留「去掉大小写 / 变音符号 / 标点 / 多余空格」的骨架，
 * 否则分级表永远报一堆假拼写错误。
 */
const nameKey = (name: string): string =>
    name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

const rosterKeys = new Map<string, string>();
for (const name of roster) {
    const key = nameKey(name);
    if (!rosterKeys.has(key)) rosterKeys.set(key, name);
}

const gradedKeys = new Set<string>();
for (const name of [...SUPERSTARS, ...ELITES, ...ALL_STARS]) {
    const key = nameKey(name);
    if (gradedKeys.has(key)) fail(`分级表里「${name}」重复出现`);
    gradedKeys.add(key);
    if (!rosterKeys.has(key)) fail(`分级表里的「${name}」不在任何名册里（拼写与变音符号要完全一致）`);
}
console.log(
    `  名册人物 ${rosterKeys.size} 人，分级 ${gradedKeys.size} 人` +
        `（超巨 ${SUPERSTARS.length} / 巨星 ${ELITES.length} / 球星 ${ALL_STARS.length}）`,
);

/* 名册里有没有明显该分级却没分级的（只提示） */
const ungraded = Array.from(rosterKeys)
    .filter(([key]) => !gradedKeys.has(key))
    .map(([, name]) => name);
console.log(`  未分级 ${ungraded.length} 人：${ungraded.slice(0, 20).join("、")}${ungraded.length > 20 ? " …" : ""}`);

/* ---------------------------------------------------------------- */
/* 3. 回本率                                                          */
/* ---------------------------------------------------------------- */
console.log("\n### 回本率（每盒型模拟 " + SAMPLES + " 盒）");
console.log("  盒型                                购入      平均售出    回本率   最高单盒");

let worst = { key: "", ratio: 0 };
let best = { key: "", ratio: 0 };

for (const box of live) {
    const cost = boxPriceEntry(box.key)?.cost ?? 0;
    let valueSum = 0;
    let top = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
        const result = ripBox(box, { seed: `prices-check-${i}`, boxIndex: i });
        const value = sumValueRmb(result.cards, box.productKey);
        valueSum += value;
        if (value > top) top = value;
    }
    const average = valueSum / SAMPLES;
    const ratio = cost > 0 ? average / cost : 0;
    ratios.push(ratio);

    if (cost === 0) {
        fail(`${box.key} 购入价为 0，无法算回本率`);
        continue;
    }
    const flag = ratio < BOX_MIN || ratio > BOX_MAX ? "[!] " : "    ";
    if (flag !== "    ") warned += 1;
    console.log(
        `  ${flag}${box.key.padEnd(46)} ¥${String(cost).padStart(6)}  ¥${average.toFixed(2).padStart(10)}` +
            `  ${(ratio * 100).toFixed(1).padStart(6)}%  ¥${top.toFixed(2)}`,
    );

    if (!worst.key || ratio < worst.ratio) worst = { key: box.key, ratio };
    if (!best.key || ratio > best.ratio) best = { key: box.key, ratio };
}

const middle = median(ratios);
console.log(
    `\n  回本率中位数 ${(middle * 100).toFixed(1)}%，` +
        `最低 ${worst.key} ${(worst.ratio * 100).toFixed(1)}%，` +
        `最高 ${best.key} ${(best.ratio * 100).toFixed(1)}%`,
);
if (middle < MEDIAN_MIN || middle > MEDIAN_MAX) {
    fail(`回本率中位数 ${(middle * 100).toFixed(1)}% 超出 ${MEDIAN_MIN * 100}-${MEDIAN_MAX * 100}% 区间，请调 card-values.ts 的基准价`);
}
if (warned > 0) console.log(`  有 ${warned} 个盒型回本率在中位数区间外，属正常波动，如果要收窄请调 products.ts 的系列系数`);

/* ---------------------------------------------------------------- */
/* 4. 人物档位比值                                                    */
/* ---------------------------------------------------------------- */
console.log(`\n### 人物倍率（分档实测日期 ${PLAYER_TIERS_AS_OF}）`);

/*
 * 单张卡的绝对价对不上可以有很多原因（系列系数、盒型构成、名册组成），
 * 但「人物之间的比值」只由人物表与加权方式决定。所以这里不比绝对价、只比比值。
 *
 * 这一节以前查的是「档位倍率落在卡淘实测区间」。那时人物只有三档，比的是档位本身；
 * 现在量到的球员直接用 PLAYER_FACTORS 的实测倍率，分子分母同出一张表，
 * 再比区间就是自证。换成三件真会坏掉的事：
 *
 *   一、量级 —— 量到的超巨在签名卡口径上必须远高于未分级。太小只可能是没量到、
 *       静默回落到了粗档位，而那正是本节要防的那个回归（旧版把弗拉格放在
 *       ×1.5 的档上，一张 10 编新秀签字真实成交 ￥24,250，模型只给 ￥701）。
 *   二、次序 —— 同一个梯队内部的实测倍率必须保持名次，次序颠倒基本只有一个原因：
 *       名字对错了人（卡淘上有两个 Harper，名册里一个是迪伦一个是罗恩）。
 *   三、兜底 —— 没量到的球员仍然走粗档位，那里的比值还得贴着市场，继续查区间。
 */
const probe = (player: string, group: GroupKind, rookie = false, numbered: number | null = 10): PulledCard => ({
    id: "probe",
    variantKey: "probe",
    fullName: "probe",
    subsetKey: "probe",
    subsetName: "probe",
    variantName: "probe",
    group,
    tier: "epic",
    player,
    team: "—",
    no: "—",
    rookie,
    numbered,
    serial: numbered ?? 1,
    oddsLabel: "—",
    odds: 1,
    pack: 1,
    slot: 1,
});

/** 随便找个在建的系列；比值与系列无关，分子分母会约掉 */
const PROBE_PRODUCT = "tcu26-basketball";
const PLAIN = "—未分级球员—";
const ratio = (player: string, group: GroupKind): number =>
    cardValueRmb(probe(player, group), PROBE_PRODUCT) / cardValueRmb(probe(PLAIN, group), PROBE_PRODUCT);

const checkRatio = (label: string, value: number, min: number, max: number): void => {
    const ok = value >= min && value <= max;
    if (!ok) failed += 1;
    console.log(`  ${ok ? "    " : "[!] "}${label.padEnd(26)} ×${value.toFixed(2).padStart(7)}   实测区间 ×${min}~×${max}`);
};

const checkFloor = (label: string, value: number, min: number, note: string): void => {
    const ok = value >= min;
    if (!ok) failed += 1;
    console.log(`  ${ok ? "    " : "[!] "}${label.padEnd(26)} ×${value.toFixed(2).padStart(7)}   下限 ×${min}${ok ? "" : `   ${note}`}`);
};

checkFloor("签名卡 弗拉格 / 未分级", ratio("Cooper Flagg", "auto"), 15, "看看是不是没量到、回落到了粗档位");
checkFloor("签名卡 哈珀 / 未分级", ratio("Dylan Harper", "auto"), 8, "看看是不是没量到、回落到了粗档位");
checkFloor("普卡 弗拉格 / 未分级", ratio("Cooper Flagg", "base"), 3, "看看是不是没量到、回落到了粗档位");

/** 梯队内部的名次：实测倍率必须与市场公认的次序一致 */
const LADDER = ["Cooper Flagg", "Dylan Harper", "Kon Knueppel", "Ace Bailey"];
const ladderAuto = LADDER.map((name) => ratio(name, "auto"));
const inOrder = ladderAuto.every((value, index) => index === 0 || value < ladderAuto[index - 1]);
if (!inOrder) fail(`实测签约倍率次序颠倒：${LADDER.map((n, i) => `${n} ×${ladderAuto[i].toFixed(2)}`).join(" > ")}`);
if (inOrder) console.log(`        签约倍率次序 ${ladderAuto.map((v) => v.toFixed(1)).join(" > ")}`);

/* 没量到的人（这里是克里斯保罗：在球星档、成交样本里签字卡不足）仍走粗档位 */
checkRatio("签名卡 球星（档位兜底）", ratio("Chris Paul", "auto"), 1.5, 8);

/*
 * 比值只证明「人物差多少」，证明不了「这张卡到底值多少」。所以补一行绝对价锚点，
 * 口径固定成「Topps Chrome Update 系列、epic 档、10 编、普通编号」的签名卡，
 * 让人能自己拿卡淘成交价对一下 —— 看得到数字才能判断模型是不是还偏 15 倍。
 * 这里不判定失败：系列系数与盒型构成都会影响绝对值。
 */
const money = (value: number): string => `￥${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const anchor = (player: string, rookie = false): number =>
    cardValueRmb(probe(player, "auto", rookie), "tcu26-basketball");
console.log("\n  绝对价锚点（Topps Chrome Update、epic 档、10 编、普通编号的签名卡）：");
console.log(`    未分级球员          ${money(anchor(PLAIN))}`);
console.log(`    超巨（非新秀）       ${money(anchor("Cooper Flagg"))}`);
console.log(`    超巨（新秀）         ${money(anchor("Cooper Flagg", true))}`);
console.log("  对照：卡淘上库珀弗拉格一张 Topps Definitive 10 编新秀签字成交 ￥24,250，");
console.log("  但 Definitive 不在在册系列里，没有对应系列系数，量级对得上即可。");

/*
 * 哈珀 /50 —— 这一行是给一次具体的估值争议留下的闸门。
 *
 * 有人开 Jumbo 盒开出迪伦哈珀 50 编，卡淘上 ￥36,149 那条是**卡签**（原封夹里的
 * 签字卡），而网站当时报的 ￥138.56 是**普卡金折**，两张不同的卡；但两边都低：
 * 普卡金折那一格模型当时给 ￥138、实测中位 ￥355，卡签 /50 模型给 ￥1,063、
 * 实测 ￥6,527。这条把「普卡 /50 落在三位数、卡签 /50 落在四位数」钉住，
 * 再退回那副低估会直接报错。区间取实测中位的上下 2~3 倍。
 *
 * 这里不能再用上面那支探针：它把 tier 写死成 epic（比比值时分子分母同 tier 会
 * 约掉，无所谓），而真卡的 tier 是 `assemble.ts` 按官方配率算出来的（base /50
 * 落在 legendary，是 epic 的两三倍）—— 快定绝对值时必须用真值。
 */
const JUMBO = "basketball.topps.tcu26-basketball.jumbo-box";

/** 从登记盒型里取一张真卡：`tier` / `odds` 都是产品实际用的那套 */
const realCard = (
    boxKey: string,
    group: GroupKind,
    numbered: number,
    player: string,
    rookie: boolean,
): PulledCard | null => {
    const box = REGISTERED_BOXES.find((item) => item.key === boxKey);
    const variant: VariantDef | undefined = box?.variants.find(
        (item) => item.group === group && item.numbered === numbered,
    );
    if (!variant) return null;
    return {
        id: "anchor",
        variantKey: variant.key,
        fullName: variant.fullName,
        subsetKey: variant.subset,
        subsetName: variant.subsetName,
        variantName: variant.variantName,
        group: variant.group,
        tier: variant.tier,
        player,
        team: "—",
        no: "—",
        rookie,
        numbered: variant.numbered,
        /** 取中间的编号：避开「第一编 / 最后一编」的加成，锚点才等于中位成交价 */
        serial: variant.numbered === null ? 1 : Math.ceil(variant.numbered / 2),
        oddsLabel: "—",
        odds: variant.odds,
        pack: 1,
        slot: 1,
    };
};

const checkBand = (label: string, value: number, min: number, max: number): void => {
    const ok = value >= min && value <= max;
    if (!ok) failed += 1;
    console.log(`  ${ok ? "    " : "[!] "}${label.padEnd(26)} ${money(value).padStart(11)}   应落在 ${money(min)}~${money(max)}`);
};

const anchorRow = (label: string, card: PulledCard | null, min: number, max: number): void => {
    if (!card) {
        fail(`${label}：登记盒型里找不到这个卡种，锚点会永远通过`);
        return;
    }
    checkBand(`${label}（${card.tier}）`, cardValueRmb(card, "tcu26-basketball"), min, max);
};

console.log("\n  哈珀 /50 绝对价锚点（Topps Chrome Update Jumbo、2025 届新秀、金折 /50）：");
anchorRow("普卡金折 /50", realCard(JUMBO, "base", 50, "Dylan Harper", true), 150, 900);
anchorRow("卡签 /50", realCard(JUMBO, "auto", 50, "Dylan Harper", true), 3000, 12000);

/* 实测存证表里写的档位必须与分档表一致，否则那张表会慢慢变成假证据 */
for (const row of TIER_EVIDENCE) {
    const actual = SUPERSTARS.includes(row.player)
        ? "超巨"
        : ELITES.includes(row.player)
          ? "巨星"
          : ALL_STARS.includes(row.player)
            ? "球星"
            : "未分级";
    if (actual !== row.tier) fail(`实测存证「${row.player}」标的是${row.tier}档，分档表实际是${actual}档`);
}

console.log(failed === 0 ? "\n价格表核对通过。" : `\n价格表核对失败 ${failed} 项。`);
process.exit(failed === 0 ? 0 : 1);