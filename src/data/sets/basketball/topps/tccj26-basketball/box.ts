/**
 * 2025-26 Topps Chrome Cactus Jack Basketball —— Hobby Box 卡盒定义
 *
 * 配率（odds）来源：Topps 官方 Pack Odds 表，单位 **1:X 包**。
 * 该产品的官方表只有一列（没有按渠道分列），表本身见同目录
 * pack-odds.generated.ts —— 这里只登记行标签，不抄数字。
 *
 * 盒规格（官方产品资料）：4 张/包 × 20 包 = 80 张，12 盒/箱，只有一个盒型。
 *
 * 两处要注意的地方：
 *   1. 官方表里的 `Base 4:1` 是「每包 4 张 Base」而不是可抽卡种的配率，
 *      直接当配率用会让每包期望张数超过 4，所以 Base 子集按残差补权重
 *      （与 Chrome Updates 的处理一致：Base 用权重残差、不用表里的那一行）。
 *   2. 官方 Checklist 与公开发行的产品资料都没有给出 Base 彩虹各档的限量数，
 *      因此除 SuperFractor（Topps Chrome 体系内恒为 1/1）外一律不标限量。
 *      插入卡与签名只登记资料里写明的档位：插入卡黑 /10，签名橙 /25、黑 /10、红 /5。
 *
 * 拆盒权重模型
 * ------------
 * 官方配率本身是「互斥平均配率」，把一包里所有可出卡种的 1/X 相加即得
 * 「每包预期出的非纯 Base 卡数」，剩余部分由纯 Base 填补：
 *     baseWeight = cardsPerPack - Σ(1/odds)
 * 于是每包若干张 = 同次数「按权重抽样」，期望张数与原版官方配率完全一致。
 */

import type {
    BoxDefinition,
    GroupKind,
    SubsetDef,
    Subject,
    Tier,
    VariantDef,
} from "@/engine/types";
import { defineBox } from "@/catalog/define";
import { PACK_ODDS, PACK_ODDS_COLUMNS, type PackOddsColumn } from "./pack-odds.generated";
import {
    ASTROVISION,
    BASE_AUTOGRAPH_VARIATION,
    BASE_CARDS,
    CACTUS_INK,
    CACTUS_MODE,
    JACKED_UP,
    LA_FLAME_LEGENDS,
    UTOPIA_HIGHLIGHTS,
    type RosterRow,
} from "./roster";

/* ------------------------------------------------------------------ */
/* 平行版本元数据                                                       */
/* ------------------------------------------------------------------ */

interface TierMeta {
    /** 平行名（空串 = 子集本身的普通版） */
    name: string;
    /** 限量数；null = 非编号 */
    numbered: number | null;
}

const TIER_META: Record<string, TierMeta> = {
    base: { name: "", numbered: null },

    /* Base 彩虹。除 SuperFractor 外官方未公布限量数，一律按非编号处理 */
    white: { name: "White Refractor", numbered: null },
    refractor: { name: "Refractor", numbered: null },
    logofractor: { name: "LogoFractor", numbered: null },
    "teal-speckle": { name: "Teal Speckle Refractor", numbered: null },
    pink: { name: "Pink Refractor", numbered: null },
    "aqua-shimmer": { name: "Aqua Shimmer Refractor", numbered: null },
    lasers: { name: "Lasers Refractor", numbered: null },
    blue: { name: "Blue Refractor", numbered: null },
    sonar: { name: "Sonar Refractor", numbered: null },
    green: { name: "Green Refractor", numbered: null },
    "purple-mini-diamond": { name: "Purple Mini-Diamond Refractor", numbered: null },
    gold: { name: "Gold Refractor", numbered: null },
    "cactus-jack": { name: "Cactus Jack Refractor", numbered: null },
    orange: { name: "Orange Refractor", numbered: null },
    black: { name: "Black Refractor", numbered: null },
    red: { name: "Red Refractor", numbered: null },
    "red-mini-diamond": { name: "Red Mini-Diamond Refractor", numbered: null },

    /* 插入卡的八个折射平行，官方资料只写明了黑 /10 */
    "insert-blue": { name: "Blue Refractor", numbered: null },
    "insert-green": { name: "Green Refractor", numbered: null },
    "insert-purple-mini-diamond": { name: "Purple Mini-Diamond Refractor", numbered: null },
    "insert-gold": { name: "Gold Refractor", numbered: null },
    "insert-orange": { name: "Orange Refractor", numbered: null },
    "insert-black": { name: "Black Refractor", numbered: 10 },

    /* 签名的折射平行，官方资料四档齐全 */
    "auto-orange": { name: "Orange Refractor", numbered: 25 },
    "auto-black": { name: "Black Refractor", numbered: 10 },
    "auto-red": { name: "Red Refractor", numbered: 5 },

    /* 三套共用：Topps Chrome 体系里 SuperFractor 恒为 1/1 */
    superfractor: { name: "SuperFractor", numbered: 1 },
};

/* ------------------------------------------------------------------ */
/* 子集定义（只登记官方表里的行标签，数字一律查表得来）                     */
/* ------------------------------------------------------------------ */

/** 一个平行：[slug, 官方 Pack Odds 表的行标签]；标签为 null 表示纯 Base，权重由残差决定 */
type VariantSpec = [slug: string, label: string | null];

interface SubsetSpec {
    key: string;
    name: string;
    code?: string;
    kind: GroupKind;
    detailed: boolean;
    /** 顺序即卡种顺序，同时决定拆盒抽样顺序，重排会改变开盒结果 */
    variants: VariantSpec[];
    roster: RosterRow[];
    note?: string;
}

/** 插入卡共用的八个折射平行（官方标签在各子集后面接同一串后缀） */
const INSERT_PARALLELS: VariantSpec[] = [
    ["insert-blue", "Blue Refractor"],
    ["insert-green", "Green Refractor"],
    ["insert-purple-mini-diamond", "Purple Mini-Diamond"],
    ["insert-gold", "Gold Refractor"],
    ["insert-orange", "Orange Refractor"],
    ["insert-black", "Black Refractor"],
    ["insert-red", "Red Refractor"],
    ["superfractor", "SuperFractor"],
];

/** 把插入卡公用的后缀拼成该子集在官方表里的完整行标签 */
const insertVariants = (name: string): VariantSpec[] => [
    ["base", name],
    ...INSERT_PARALLELS.map(([slug, suffix]) => [slug, `${name} ${suffix}`] as VariantSpec),
];

const SPECS: SubsetSpec[] = [
    {
        key: "base",
        name: "Base Set",
        kind: "base",
        detailed: true,
        roster: BASE_CARDS,
        variants: [
            ["base", null],
            ["white", "Base White"],
            ["refractor", "Base Refractor"],
            ["logofractor", "Base LogoFractor"],
            ["teal-speckle", "Base Teal Speckle Refractor"],
            ["pink", "Base Pink Refractor"],
            ["aqua-shimmer", "Base Aqua Shimmer"],
            ["lasers", "Base Lasers"],
            ["blue", "Base Blue Refractor"],
            ["sonar", "Base Sonar"],
            ["green", "Base Green Refractor"],
            ["purple-mini-diamond", "Base Purple Mini-Diamond"],
            ["gold", "Base Gold Refractor"],
            ["cactus-jack", "Base Cactus Jack Refractor"],
            ["orange", "Base Orange Refractor"],
            ["black", "Base Black Refractor"],
            ["red", "Base Red Refractor"],
            ["red-mini-diamond", "Base Red Mini-Diamond Refractor"],
            ["superfractor", "Base SuperFractor"],
        ],
        note: "100 张，18 档折射平行。官方资料未公布各档限量数，除 SuperFractor（1/1）外均按非编号展示。",
    },
    {
        key: "utopia-highlights",
        name: "Utopia Highlights",
        code: "UH",
        kind: "insert",
        detailed: true,
        roster: UTOPIA_HIGHLIGHTS,
        variants: insertVariants("Utopia Highlights"),
    },
    {
        key: "jacked-up",
        name: "Jacked Up",
        code: "JU",
        kind: "insert",
        detailed: true,
        roster: JACKED_UP,
        variants: insertVariants("Jacked Up"),
    },
    {
        key: "la-flame-legends",
        name: "LA Flame Legends",
        code: "LFL",
        kind: "insert",
        detailed: true,
        roster: LA_FLAME_LEGENDS,
        variants: insertVariants("LA Flame Legends"),
        note: "全部为名宿。",
    },
    {
        key: "astrovision",
        name: "Astrovision",
        code: "AST",
        kind: "ssp",
        detailed: true,
        roster: ASTROVISION,
        variants: [
            ["base", "Astrovision"],
            ["superfractor", "Astrovision SuperFractor"],
        ],
        note: "超短印追卡，唯一平行是 SuperFractor。",
    },
    {
        key: "cactus-mode",
        name: "Cactus Mode",
        code: "CM",
        kind: "ssp",
        detailed: true,
        roster: CACTUS_MODE,
        variants: [
            ["base", "Cactus Mode"],
            ["superfractor", "Cactus Mode SuperFractor"],
        ],
        note: "超短印追卡，唯一平行是 SuperFractor。",
    },
    {
        key: "base-autograph-variation",
        name: "Base Autograph Variation",
        code: "BV",
        kind: "auto",
        detailed: true,
        roster: BASE_AUTOGRAPH_VARIATION,
        variants: [
            ["base", "Base Autograph Variation"],
            ["auto-orange", "Base Autograph Variation Orange Refractor"],
            ["auto-black", "Base Autograph Variation Black Refractor"],
            ["auto-red", "Base Autograph Variation Red Refractor"],
            ["superfractor", "Base Autograph Variation SuperFractor"],
        ],
        note: "硬签。部分球员带题字。",
    },
    {
        key: "cactus-ink",
        name: "Cactus Ink",
        code: "CI",
        kind: "auto",
        detailed: true,
        roster: CACTUS_INK,
        variants: [
            ["base", "Cactus Ink"],
            ["auto-orange", "Cactus Ink Orange Refractor"],
            ["auto-black", "Cactus Ink Black Refractor"],
            ["auto-red", "Cactus Ink Red Refractor"],
            ["superfractor", "Cactus Ink SuperFractor"],
        ],
        note: "硬签。",
    },
];

/* ------------------------------------------------------------------ */
/* 构造逻辑                                                             */
/* ------------------------------------------------------------------ */

/** 该系列只有一个盒型，官方表也只有一个渠道列 */
const COLUMN: PackOddsColumn = "odds";
const COLUMN_INDEX = PACK_ODDS_COLUMNS.indexOf(COLUMN);

const ODDS_BY_LABEL = new Map(PACK_ODDS.map((row) => [row.label, row.odds]));

/** 取某个平行在该列的配率；null 表示本盒没有这个卡种 */
const oddsAt = (label: string | null): number | null => {
    if (label === null) return 0;
    return ODDS_BY_LABEL.get(label)?.[COLUMN_INDEX] ?? null;
};

const toSubjects = (rows: RosterRow[]): Subject[] =>
    rows.map((row) => ({
        no: row[0],
        player: row[1],
        team: row[2],
        rookie: row[3] === "R",
    }));

/** 稀有度判定：编号卡按限量数，非编号卡按配率 */
const tierOf = (odds: number, numbered: number | null, kind: GroupKind): Tier => {
    if (kind === "auto" || kind === "relic" || kind === "ssp") {
        return odds > 100000 ? "mythic" : "legendary";
    }
    if (numbered !== null) {
        if (numbered >= 100) return "epic";
        if (numbered >= 20) return "legendary";
        return "mythic";
    }
    if (odds <= 12) return "uncommon";
    if (odds <= 90) return "rare";
    if (odds <= 1500) return "epic";
    if (odds <= 80000) return "legendary";
    return "mythic";
};

interface BoxConfig {
    slug: string;
    name: string;
    cardsPerPack: number;
    packsPerBox: number;
    /** 官方未公布时留 0，页面上就不显示「盒 / 箱」 */
    boxesPerCase: number;
    autoGuaranteed: boolean;
    boxExclusives: string[];
}

const NOTES = [
    "官方配率是「平均配率」，实际开封结果会有波动，且不保证每个卡人都出现在所有平行里。",
    "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
    "官方未公布 Base 彩虹各档的限量数，故除 SuperFractor（1/1）外均按非编号展示。",
];

const build = (config: BoxConfig): BoxDefinition => {
    const subsets: SubsetDef[] = [];
    const variants: VariantDef[] = [];
    let premiumWeight = 0;

    for (const spec of SPECS) {
        if (spec.variants.some(([, label]) => label !== null && oddsAt(label) === null)) {
            // 官方表改了行标签就会走到这里；宁可报错也不要静默少一个卡种
            console.error(`[tccj26] 官方配率表里缺少子集 ${spec.name} 的行标签`);
        }

        subsets.push({
            key: spec.key,
            name: spec.name,
            code: spec.code,
            kind: spec.kind,
            detailed: spec.detailed,
            inBox: true,
            subjects: toSubjects(spec.roster),
            note: spec.note,
        });

        for (const [slug, label] of spec.variants) {
            const odds = oddsAt(label) ?? 0;
            const meta = TIER_META[slug] ?? { name: slug, numbered: null };
            const numbered = odds > 0 ? meta.numbered : null;
            // odds === 0 是「普通 Base」占位，权重稍后按残差补
            const weight = odds > 0 ? 1 / odds : 0;
            if (odds > 0) premiumWeight += weight;

            variants.push({
                key: `${spec.key}:${slug}`,
                subset: spec.key,
                subsetName: spec.name,
                variantName: meta.name,
                fullName: meta.name ? `${spec.name} · ${meta.name}` : spec.name,
                group: spec.kind,
                tier: odds > 0 ? tierOf(odds, numbered, spec.kind) : "common",
                odds,
                numbered,
                weight,
            });
        }
    }

    const baseWeight = Math.max(0.5, config.cardsPerPack - premiumWeight);
    for (const v of variants) if (v.odds === 0) v.weight = baseWeight;

    return defineBox({
        slug: config.slug,
        name: config.name,
        category: "basketball",
        maker: "topps",
        productKey: "tccj26-basketball",
        productName: "2025-26 Topps Chrome Cactus Jack Basketball",
        year: "2025-26",
        live: true,
        releaseDate: "2026-06-19",
        cardsPerPack: config.cardsPerPack,
        packsPerBox: config.packsPerBox,
        boxesPerCase: config.boxesPerCase,
        autoGuaranteed: config.autoGuaranteed,
        boxExclusives: config.boxExclusives,
        notes: NOTES,
        absentSubsets: [],
        subsets,
        variants,
        baseWeight,
    });
};

/** 本系列只发行了 Hobby 一种盒 */
const BOX_CONFIGS: BoxConfig[] = [
    {
        slug: "hobby-box",
        name: "2025-26 Topps Chrome Cactus Jack Basketball Hobby Box",
        cardsPerPack: 4,
        packsPerBox: 20,
        boxesPerCase: 12,
        autoGuaranteed: false,
        boxExclusives: [],
    },
];

/** 本系列已实现的全部盒型 */
export const TCCJ26_BASKETBALL_BOXES: BoxDefinition[] = BOX_CONFIGS.map((config) => build(config));
