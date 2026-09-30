/**
 * 2025-26 Topps NBA Hoops Basketball —— 盒型定义
 *
 * 配率来源：官方 Pack Odds 表（`pack-odds.generated.ts`，五个渠道：Hobby /
 * Hobby Jumbo / Value Box / Hanger Box / Fanatics Box）；名册来源：官方 Checklist
 * 表格版。子集边界与平行列表由 `shared/assemble.ts` 照着这两张表展开，这里只写
 * 「有哪些子集、各自对应官方表里的哪条行标签」以及盒型规格。
 *
 * 限量数来源：Checklist Insider 指南页的平行列表（官方表不含编号）。指南页把配率写在
 * 平行名后面（`Pixel Burst Purple /99 (1:88 Hobby; 1:21 Jumbo)`），已逐行与官方表
 * 核对过，数值一致。两处对不上，都以官方表为准：
 *   - 指南页在 `Green Hoops (1:3 Blaster; 1:8 Fanatics; Hanger)`、`The Buzz / Net 2 Net
 *     / Jam-Packed` 的 `Green Hoops` 后面写了 Hanger，官方表这几行在 Hanger 列是空的；
 *   - `Rainbow Yellow /275` 指南页只列到 Jumbo，官方表也只有 Hobby / Jumbo 两列。
 *
 * 普卡走残差：官方表每一行给的是「每包命中一次」的概率，五行加起来都不足每包张数，
 * 差额只能落在普卡上。所以本系列的五个盒型都用 `residualLabel: "Base"` 把官方表里
 * `Base` 那一行指到残差上：它拿 `每包张数 − 其余各行 1:X 之和`。按官方配率算出来的
 * 残差与官方 `Base` 那一行基本吻合（Hobby 6.99 / 7、Value Box 7.07 / 7、
 * Fanatics 7.2 / 7、Hanger 20.9 / 19、Jumbo 17.0 / 15）。
 *
 * 普卡平叉成两套、互不出现在对方盒型里：Hobby / Jumbo 是 Pixel Burst 一套
 * （`Base Pixel Burst*`、`Base Rainbow Green and Blue`、`Base Rainbow Gold and Green`、
 * `Base Rainbow Yellow`），Value Box / Hanger / Fanatics 是 Light Burst 一套
 * （`Base Light Burst*`、`Base Rainbow Teal`、`Base Rainbow Blue and Yellow`、
 * `Base Rainbow Red and Orange`、`Base Rainbow Purple and Blue`）；`Base Orange Hoops`
 * 只在 Hanger（2:1）、`Base Fanatics` 只在 Fanatics，`Base Green Hoops` 只在
 * Value Box 与 Fanatics。官方表里为空的档位，`assemble.ts` 直接不进该盒型。
 *
 * 签名卡的官方卡号只写到组号：同一组里的几张卡共用一个号（`HRD-A` 底下排着 5 张双签，
 * `HHS-G` 底下并排着三张单签）。`roster.ts` 由 `scripts/import-roster.mjs` 的组号表
 * 按「组号 + 卡序号」拆开，不拆的话模拟器会把一组里的几张卡并成一张。
 *
 * 300 张普卡横跨名册的五个分节（BASE CARDS I 1-100、II 101-200、III 201-260、
 * HIGHLIGHTS 261-270、ALL STARS 271-300），平行覆盖整套普卡，所以五节合成一个子集，
 * 官方表也只给了一行 `Base`。
 *
 * 盒型规格（指南页）：Hobby 8 张 × 20 包 / 箱 12 盒、保底 1 张签名；Jumbo 20 张 ×
 * 10 包 / 箱 8 盒、保底 2 张；Value Blaster 8 张 × 7 包 / 箱 40 盒、无保底；
 * Fanatics Blaster 8 张 × 8 包，每箱盒数官方没写；Hanger 25 张 × 1 包、每箱 64 盒。
 */
import { assembleBoxes, type SubsetPlan, type VariantMeta } from "../shared/assemble";
import { PACK_ODDS, PACK_ODDS_COLUMNS } from "./pack-odds.generated";
import { ROSTER_SECTIONS } from "./roster";

/** 平行名 → 限量数；null = 非编号 */
type Runs = Record<string, number | null>;

/**
 * 把一张「平行名 → 限量数」表铺成 `variantMeta`：键是官方表里的整条行标签
 * （子集前缀 + 平行名），空串那一条就是子集本身的普通版。
 */
const meta = (prefix: string, runs: Runs): Record<string, VariantMeta> =>
    Object.fromEntries(
        Object.entries(runs).map(([suffix, numbered]) => [
            suffix ? `${prefix} ${suffix}` : prefix,
            { numbered },
        ]),
    );

/** 普卡：Hobby / Jumbo 的 Pixel Burst 一套 + 零售的 Light Burst 一套 */
const BASE: Runs = {
    "": null,
    Rainbow: null,
    "Rainbow Yellow": 275,
    "Rainbow Green and Blue": 249,
    "Rainbow Gold and Green": 199,
    "Rainbow Teal": 299,
    "Rainbow Blue and Yellow": 275,
    "Rainbow Red and Orange": 249,
    "Rainbow Purple and Blue": 199,
    "Pixel Burst": null,
    "Pixel Burst Blue": 149,
    "Pixel Burst Purple": 99,
    "Pixel Burst Green": 75,
    "Pixel Burst Gold": 50,
    "Pixel Burst Orange": 25,
    "Pixel Burst Black": 10,
    "Pixel Burst Red": 5,
    "Pixel Burst Platinum": 1,
    "Light Burst": null,
    "Light Burst Blue": 149,
    "Light Burst Purple": 99,
    "Light Burst Green": 75,
    "Light Burst Gold": 50,
    "Light Burst Orange": 25,
    "Light Burst Black": 10,
    "Light Burst Red": 5,
    "Light Burst Platinum": 1,
    "Green Hoops": null,
    "Orange Hoops": null,
    Fanatics: null,
};

/** 插入卡：Rainbow + Pixel Burst 一套，从 Purple /99 起算 */
const PIXEL_INSERT: Runs = {
    "": null,
    Rainbow: null,
    "Pixel Burst": null,
    "Pixel Burst Purple": 99,
    "Pixel Burst Green": 75,
    "Pixel Burst Gold": 50,
    "Pixel Burst Orange": 25,
    "Pixel Burst Black": 10,
    "Pixel Burst Red": 5,
    "Pixel Burst Platinum": 1,
};

/** 签名卡：Pixel Burst 一套，没有非编号那一档 */
const PIXEL_AUTO: Runs = {
    "": null,
    "Pixel Burst Purple": 99,
    "Pixel Burst Green": 75,
    "Pixel Burst Gold": 50,
    "Pixel Burst Orange": 25,
    "Pixel Burst Black": 10,
    "Pixel Burst Red": 5,
    "Pixel Burst Platinum": 1,
};

/** 双人 / 三人签名卡：只有 Black、Red、Platinum 三档 */
const PIXEL_MULTI: Runs = {
    "": null,
    "Pixel Burst Black": 10,
    "Pixel Burst Red": 5,
    "Pixel Burst Platinum": 1,
};

/** 插入卡：Green Hoops、Light Burst 一套，另加 Hanger 专属的 Orange Hoops */
const LIGHT_INSERT: Runs = {
    "": null,
    "Green Hoops": null,
    "Light Burst": null,
    "Light Burst Purple": 99,
    "Light Burst Green": 75,
    "Light Burst Gold": 50,
    "Light Burst Orange": 25,
    "Light Burst Black": 10,
    "Light Burst Red": 5,
    "Light Burst Platinum": 1,
    "Orange Hoops": null,
};

/** 签名卡：Light Burst 一套，没有非编号那一档 */
const LIGHT_AUTO: Runs = {
    "": null,
    "Light Burst Purple": 99,
    "Light Burst Green": 75,
    "Light Burst Gold": 50,
    "Light Burst Orange": 25,
    "Light Burst Black": 10,
    "Light Burst Red": 5,
    "Light Burst Platinum": 1,
};

/** 只有一条平行：Platinum 1/1 */
const PLATINUM: Runs = { "": null, Platinum: 1 };

/** 官方表里只有一条行标签、没有平行 */
const SINGLE: Runs = { "": null };

export const SUBSETS: SubsetPlan[] = [
    {
        section: [
            "BASE CARDS I",
            "BASE CARDS II",
            "BASE CARDS III",
            "HIGHLIGHTS",
            "ALL STARS",
        ],
        label: "Base",
        kind: "base",
        variantMeta: meta("Base", BASE),
        note: "300 张：BASE CARDS I 1-100、BASE CARDS II 101-200、BASE CARDS III 201-260、HIGHLIGHTS 261-270、ALL STARS 271-300。",
    },
    {
        section: "BOUNCE HOUSE",
        label: "Bounce House",
        variantMeta: meta("Bounce House", PIXEL_INSERT),
        note: "25 张。",
    },
    {
        section: "NEXT EPISODE",
        label: "Next Episode",
        variantMeta: meta("Next Episode", PIXEL_INSERT),
        note: "20 张。",
    },
    {
        section: "DUNKUMENTORY",
        label: "Dunk-umentory",
        variantMeta: meta("Dunk-umentory", PIXEL_INSERT),
        note: "15 张。",
    },
    {
        section: "PAY ATTENTION",
        label: "Pay Attention",
        variantMeta: meta("Pay Attention", PIXEL_INSERT),
        note: "20 张。",
    },
    {
        section: "HOOPERS",
        label: "Hoopers",
        variantMeta: meta("Hoopers", PIXEL_INSERT),
        note: "20 张。",
    },
    {
        section: "FINALS PURSUIT",
        label: "Finals Pursuit",
        variantMeta: meta("Finals Pursuit", SINGLE),
        note: "100 张，按轮次分七档。",
    },
    {
        section: "OASIS",
        label: "Oasis",
        variantMeta: meta("Oasis", { "": null, Platinum: 1 }),
        note: "25 张。",
    },
    {
        section: "JOY",
        label: "Joy",
        variantMeta: meta("Joy", { "": null, Platinum: 1 }),
        note: "10 张。",
    },
    {
        section: "CHECKMATE",
        label: "Checkmate",
        variantMeta: meta("Checkmate", { "": null, Platinum: 1 }),
        note: "30 张。",
    },
    {
        section: "HOOPNOTIC",
        label: "Hoopnotic",
        variantMeta: meta("Hoopnotic", { "": null, Platinum: 1 }),
        note: "35 张。",
    },
    {
        section: "HARDWIRED",
        label: "Hardwired",
        variantMeta: meta("Hardwired", LIGHT_INSERT),
        note: "25 张。",
    },
    {
        section: "THE BUZZ",
        label: "The Buzz",
        variantMeta: meta("The Buzz", LIGHT_INSERT),
        note: "30 张。",
    },
    {
        section: "NET 2 NET",
        label: "Net 2 Net",
        variantMeta: meta("Net 2 Net", LIGHT_INSERT),
        note: "30 张。",
    },
    {
        section: "JAM PACKED",
        label: "Jam-Packed",
        variantMeta: meta("Jam-Packed", LIGHT_INSERT),
        note: "15 张。",
    },
    {
        section: "BLOCK BY BLOCK",
        label: "Block by Block",
        variantMeta: meta("Block by Block", PLATINUM),
        note: "40 张。",
    },
    {
        section: "BOOM SHAKA LAKA",
        label: "Boom Shaka Laka",
        variantMeta: meta("Boom Shaka Laka", PLATINUM),
        note: "10 张。",
    },
    {
        section: "HOOPS ROOKIE SIGNATURES",
        label: "Hoops Rookie Signatures",
        kind: "auto",
        variantMeta: meta("Hoops Rookie Signatures", PIXEL_AUTO),
        note: "40 张新秀签名卡。",
    },
    {
        section: "HOOPS SIGNS",
        label: "Hoops Signs",
        kind: "auto",
        variantMeta: meta("Hoops Signs", PIXEL_AUTO),
        note: "54 张签名卡。",
    },
    {
        section: "HOOPS ROOKIE DUALS",
        label: "Hoops Rookies Duals",
        kind: "auto",
        variantMeta: meta("Hoops Rookies Duals", PIXEL_MULTI),
        note: "25 张双人签名卡。",
    },
    {
        section: "HOOPS ROOKIE TRIPLES",
        label: "Hoops Rookie Triples",
        kind: "auto",
        variantMeta: meta("Hoops Rookie Triples", PIXEL_MULTI),
        note: "10 张三人签名卡。",
    },
    {
        section: "HOOPS ROOKIE VETERAN DUALS",
        label: "Hoops Rookie Veteran Duals",
        kind: "auto",
        variantMeta: meta("Hoops Rookie Veteran Duals", PIXEL_MULTI),
        note: "5 张新秀与老将的双人签名卡。",
    },
    {
        section: "HOOPS 1989 SIGNATURES",
        label: "Hoops 1989 Signatures",
        kind: "auto",
        variantMeta: meta("Hoops 1989 Signatures", {
            "": null,
            "Green Hoops": null,
            "Light Burst": null,
            "Pixel Burst Black": 10,
            "Pixel Burst Red": 5,
            "Pixel Burst Platinum": 1,
        }),
        note: "60 张签名卡，向 1989 年初代 Hoops 设计致意。",
    },
    {
        section: "HOOPS ROOKIE FIRST SIGNS",
        label: "Hoops Rookies First Signs",
        kind: "auto",
        variantMeta: meta("Hoops Rookies First Signs", LIGHT_AUTO),
        note: "50 张新秀签名卡，零售渠道专属。",
    },
    {
        section: "HOOPS HYPER SIGNATURES",
        label: "Hoops Hyper Signatures",
        kind: "auto",
        variantMeta: meta("Hoops Hyper Signatures", LIGHT_AUTO),
        note: "47 张签名卡，零售渠道专属。",
    },
];

const NOTES = [
    "官方给出的是平均配率，按包计算，实际拆盒会有波动。",
    "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
    "普卡平行分两套：Hobby 与 Jumbo 走 Pixel Burst 一套，零售渠道走 Light Burst 一套，两边不出现在对方的盒型里。",
    "Hanger 每包 25 张，Hobby Jumbo 每包 20 张，其余盒型每包 8 张；官方表里的 Base 一行只算非平行普卡，本模拟器按「每包张数 = 各档权重之和」反推它的权重。",
    "追卡：Hoops Rookie Triples、Hoops Rookie Veteran Duals、Hoops 1989 Signatures、Hoops Hyper Signatures。",
];

export const THOOPS26_BASKETBALL_BOXES = assembleBoxes({
    productKey: "thoops26-basketball",
    productName: "2025-26 Topps NBA Hoops Basketball",
    year: "2025-26",
    releaseDate: "2026-05-14",
    category: "basketball",
    maker: "topps",
    live: true,
    notes: NOTES,
    odds: { columns: PACK_ODDS_COLUMNS, rows: PACK_ODDS },
    sections: ROSTER_SECTIONS,
    subsets: SUBSETS,
    columnNames: {
        hobby: "Hobby",
        "hobby-jumbo": "Hobby Jumbo",
        "value-box": "Value Blaster",
        "hanger-box": "Hanger",
        "fanatics-box": "Fanatics",
    },
    boxes: [
        {
            slug: "thoops26-hobby",
            name: "2025-26 Topps NBA Hoops Basketball Hobby Box",
            column: "hobby",
            cardsPerPack: 8,
            packsPerBox: 20,
            boxesPerCase: 12,
            autoGuaranteed: true,
            boxExclusives: [
                "每盒一张签名卡。",
                "普卡平行是 Hobby 与 Jumbo 专属的 Pixel Burst 一套。",
            ],
        },
        {
            slug: "thoops26-hobby-jumbo",
            name: "2025-26 Topps NBA Hoops Basketball Hobby Jumbo Box",
            column: "hobby-jumbo",
            cardsPerPack: 20,
            packsPerBox: 10,
            boxesPerCase: 8,
            autoGuaranteed: true,
            boxExclusives: [
                "每盒两张签名卡。",
                "普卡平行是 Hobby 与 Jumbo 专属的 Pixel Burst 一套。",
            ],
        },
        {
            slug: "thoops26-value-box",
            name: "2025-26 Topps NBA Hoops Basketball Value Blaster Box",
            column: "value-box",
            cardsPerPack: 8,
            packsPerBox: 7,
            boxesPerCase: 40,
            autoGuaranteed: false,
            boxExclusives: [
                "普卡平行是零售渠道的 Light Burst 一套。",
                "零售专属的 Hoops Rookies First Signs、Hoops Hyper Signatures 在这里。",
            ],
        },
        {
            slug: "thoops26-hanger",
            name: "2025-26 Topps NBA Hoops Basketball Hanger Box",
            column: "hanger-box",
            cardsPerPack: 25,
            packsPerBox: 1,
            boxesPerCase: 64,
            autoGuaranteed: false,
            boxExclusives: [
                "每包 25 张。",
                "普卡平行是零售渠道的 Light Burst 一套，另有 Hanger 专属的 Orange Hoops。",
                "零售专属的 Hoops Rookies First Signs、Hoops Hyper Signatures 在这里。",
            ],
        },
        {
            slug: "thoops26-fanatics",
            name: "2025-26 Topps NBA Hoops Basketball Fanatics Box",
            column: "fanatics-box",
            cardsPerPack: 8,
            packsPerBox: 8,
            boxesPerCase: 0,
            autoGuaranteed: false,
            boxExclusives: [
                "Fanatics 盒专属的 Base Fanatics 平行。",
                "零售专属的 Hoops Rookies First Signs、Hoops Hyper Signatures 在这里。",
            ],
        },
    ],
});
