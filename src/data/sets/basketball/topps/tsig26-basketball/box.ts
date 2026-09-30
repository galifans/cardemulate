/**
 * 2025-26 Topps Signature Class Basketball —— 盒型定义
 *
 * 配率来源：官方 Pack Odds 表（`pack-odds.generated.ts`，四个渠道：Hobby /
 * Hobby Jumbo / Value Box / Mega Box）；名册来源：官方 Checklist 表格版。子集边界与
 * 平行列表由 `shared/assemble.ts` 照着这两张表展开，这里只写「有哪些子集、各自对应
 * 官方表里的哪条行标签」以及盒型规格。
 *
 * 限量数来源：Checklist Insider 指南页的平行列表（官方表不含编号）。指南页把配率写在
 * 平行名后面（`Green Refractor /150 (1:96 Hobby; 1:21 Jumbo; …)`），已逐行与官方表
 * 核对过，数值一致；只有两处名字对不上——指南页的 `Indigo /175` 在官方表里叫 `Lime`，
 * 指南页的 `Purple Refractor /199` 与其配率对应的 /100 不是一档。两处都以官方表为准。
 *
 * 老兵卡走残差：官方表每一行的配率是「每包命中一次」的概率，各行加起来却不足每包张数
 * （Hobby 2.3746 / Jumbo 5.9649 / Value Box 1.4948 / Mega 1.8094）。不足的部分只能由
 * 纸质老兵普卡补，所以四个盒型都用 `residualLabel` 把 `Veteran Class Base` 这一条指到
 * 残差上：它拿 `每包张数 − 其余各行 1:X 之和`，这样「每包张数 = 各档权重之和」成立。
 * 其余三套普卡的官方配率（新秀 0.5、折射老兵 0.5、折射新秀 0.25）照原样参与求和。
 *
 * 纸质普卡与折射版普卡分成四个 base 子集：两个系列各有老兵卡与新秀卡两套，卡号
 * 范围一样但球员不同。纸质版 68 号是 Anthony Edwards、折射版 68 号是 Nick Smith Jr.
 * （指南页的逐卡索引把两张卡分开记成 `Base - Anthony Edwards (68)` 与
 * `Base Chrome - Nick Smith Jr. (68)`），纸质版新秀只到 149 号、折射版到 150 号，而
 * `Carter Bryant` 只出现在折射版新秀的 148 号、纸质版新秀没有这一号（指南页那一节也
 * 写着 `49 cards. Card #150 not listed.`）。合成一个子集会让同号的两张卡并成一张，
 * 官方表里两套的配率也不一样，所以按官方表的四条行标签各留一个子集。
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

/**
 * 纸质普卡的平行。老兵卡与新秀卡共用同一张印量表（指南页两节列的 /N 完全一样），
 * 所以两套平行共用一个 `Runs`。
 */
const PAPER_BASE: Runs = {
    "": null,
    "Blue & Orange": null,
    Bronze: null,
    Yellow: 399,
    Coral: 299,
    Magenta: 250,
    Teal: 225,
    Lime: 175,
    Green: 150,
    Purple: 100,
    Pink: 75,
    Orange: 50,
    Red: 25,
    "Red Lava": 25,
    Black: 10,
    "Black Gold": 10,
    Blue: 5,
    FoilFractor: 1,
};

/** 折射版普卡的平行；`Lime` 就是指南页写的 `Indigo /175`。 */
const CHROME_BASE: Runs = {
    "": null,
    Refractor: null,
    Pandora: null,
    "Pandora Yellow": null,
    Yellow: 275,
    Magenta: 250,
    Teal: 225,
    Lime: 175,
    Green: 150,
    Purple: 100,
    Pink: 75,
    Orange: 50,
    Red: 25,
    "Red Lava": 25,
    Gold: 10,
    Blue: 5,
    Superfractor: 1,
};

/** 插入卡：橙 / 红 / 金 / 蓝 / SuperFractor 1/1 */
const INSERT_RAINBOW: Runs = {
    "": null,
    Orange: 50,
    Red: 25,
    Gold: 10,
    Blue: 5,
    Superfractor: 1,
};

/** 插入卡：末档是 Black 而不是 SuperFractor */
const INSERT_BLACK: Runs = {
    "": null,
    Orange: 50,
    Red: 25,
    Gold: 10,
    Blue: 5,
    Black: 1,
};

/** 插入卡：没有橙色，红起算 */
const INSERT_BLACK_TOP: Runs = {
    "": null,
    Red: 25,
    Gold: 10,
    Blue: 5,
    Black: 1,
};

/** 纸质签名卡：八档，末档 Black 1/1 */
const PAPER_AUTO: Runs = {
    "": null,
    Purple: 100,
    Orange: 50,
    Red: 25,
    "Red Lava": 25,
    Gold: 10,
    "White Gold": 10,
    Blue: 5,
    Black: 1,
};

/** 折射版签名卡：六档，末档 SuperFractor 1/1 */
const CHROME_AUTO: Runs = {
    "": null,
    Orange: 50,
    "Red Lava": 25,
    Red: 25,
    Gold: 10,
    Blue: 5,
    Superfractor: 1,
};

/** 水晶卡签名：Monarch 非编号，Milkweed 1/1 */
const CLEAR_AUTO: Runs = { "": null, Monarch: null, Milkweed: 1 };

/** Manuscripts 是签名卡，但平行表跟插入卡一样 */
const MANUSCRIPTS: Runs = {
    "": null,
    Purple: 100,
    Orange: 50,
    Red: 25,
    Gold: 10,
    Blue: 5,
    Superfractor: 1,
};

/** 双人 / 三人签名：只有金与 1/1 两档 */
const MULTI_AUTO: Runs = { "": null, Gold: 10, Superfractor: 1 };

/** 官方表里只有一条行标签、没有平行 */
const SINGLE: Runs = { "": null };

export const SUBSETS: SubsetPlan[] = [
    {
        section: "BASE CARDS I",
        label: "Veteran Class Base",
        kind: "base",
        variantMeta: meta("Veteran Class Base", PAPER_BASE),
        note: "100 张纸质老兵普卡，卡号 1-100。",
    },
    {
        section: "BASE CARDS II",
        label: "Rookie Class Base",
        kind: "base",
        variantMeta: meta("Rookie Class Base", PAPER_BASE),
        note: "49 张纸质新秀普卡，卡号 101-149。",
    },
    {
        section: "BASE CARDS I CHROME VARIATION",
        label: "Veteran Class Chrome Base",
        kind: "base",
        variantMeta: meta("Veteran Class Chrome Base", CHROME_BASE),
        note: "100 张折射版老兵普卡。",
    },
    {
        section: "BASE CARDS II CHROME VARIATION",
        label: "Rookie Class Chrome Base",
        kind: "base",
        variantMeta: meta("Rookie Class Chrome Base", CHROME_BASE),
        note: "50 张折射版新秀普卡。",
    },
    {
        section: "AFTER IMAGE",
        label: "After Image",
        variantMeta: meta("After Image", INSERT_RAINBOW),
        note: "25 张。",
    },
    {
        section: "HIGH FIDELITY",
        label: "High Fidelity",
        variantMeta: meta("High Fidelity", INSERT_RAINBOW),
        note: "30 张。",
    },
    {
        section: "PURE",
        label: "Pure",
        variantMeta: meta("Pure", INSERT_RAINBOW),
        note: "25 张。",
    },
    {
        section: "UNFAZED",
        label: "Unfazed",
        variantMeta: meta("Unfazed", INSERT_RAINBOW),
        note: "20 张。",
    },
    {
        section: "STAR CAST",
        label: "Star Cast",
        variantMeta: meta("Star Cast", INSERT_BLACK),
        note: "25 张。",
    },
    {
        section: "ALGORITHM",
        label: "Algorithm",
        variantMeta: meta("Algorithm", INSERT_BLACK),
        note: "25 张。",
    },
    {
        section: "ROSES",
        label: "Roses",
        variantMeta: meta("Roses", INSERT_BLACK_TOP),
        note: "25 张。",
    },
    {
        section: "FLUIDITY",
        label: "Fluidity",
        variantMeta: meta("Fluidity", INSERT_BLACK_TOP),
        note: "20 张。",
    },
    {
        section: "ARISTOCRATS",
        label: "Aristocrat",
        name: "Aristocrats",
        kind: "ssp",
        variantMeta: meta("Aristocrat", SINGLE),
        note: "20 张。只在 Value Blaster 盒与 Mega 盒里出。",
    },
    {
        section: "MONARCHS OF THE GAME",
        label: "Monarchs of the Game",
        kind: "ssp",
        variantMeta: meta("Monarchs of the Game", SINGLE),
        note: "30 张。只在 Hobby 盒与 Hobby Jumbo 盒里出。",
    },
    {
        section: "LEVIATHANS",
        label: "Leviathans",
        kind: "ssp",
        variantMeta: meta("Leviathans", SINGLE),
        note: "20 张。只在 Hobby 盒与 Hobby Jumbo 盒里出。",
    },
    {
        section: "ODYSSEY",
        label: "Odyssey",
        kind: "ssp",
        variantMeta: meta("Odyssey", SINGLE),
        note: "20 张。只在 Value Blaster 盒与 Mega 盒里出。",
    },
    {
        section: "PRESSURE POINTS",
        label: "Pressure Points",
        kind: "ssp",
        variantMeta: meta("Pressure Points", SINGLE),
        note: "10 张。只在 Value Blaster 盒与 Mega 盒里出。",
    },
    {
        section: "BASE VETERAN CLASS AUTOGRAPHS",
        label: "Veteran Class Autographs",
        kind: "auto",
        variantMeta: meta("Veteran Class Autographs", PAPER_AUTO),
        note: "46 张。",
    },
    {
        section: "BASE VETERAN CLASS CHROME AUTOGRAPHS",
        label: "Veteran Class Chrome Autographs",
        kind: "auto",
        variantMeta: meta("Veteran Class Chrome Autographs", CHROME_AUTO),
        note: "46 张。",
    },
    {
        section: "VETERAN CLASS CRYSTAL CLEAR AUTOGRAPHS",
        label: "Veteran Class Crystal Clear Autographs",
        kind: "auto",
        variantMeta: meta("Veteran Class Crystal Clear Autographs", CLEAR_AUTO),
        note: "37 张。只在 Hobby 盒与 Hobby Jumbo 盒里出。",
    },
    {
        section: "BASE ROOKIE CLASS AUTOGRAPHS",
        label: "Rookie Class Autographs",
        kind: "auto",
        variantMeta: meta("Rookie Class Autographs", PAPER_AUTO),
        note: "46 张。",
    },
    {
        section: "BASE ROOKIE CLASS CHROME AUTOGRAPHS",
        label: "Rookie Class Chrome Autographs",
        kind: "auto",
        variantMeta: {
            ...meta("Rookie Class Chrome Autographs", CHROME_AUTO),
            // 官方表把这一条的小写 l 印成 `Red lava`，显示名统一成 `Red Lava`（限量数同指南页的 /25）
            "Rookie Class Chrome Autographs Red lava": { name: "Red Lava", numbered: 25 },
        },
        note: "46 张。",
    },
    {
        section: "ROOKIE CLASS CRYSTAL CLEAR AUTOGRAPHS",
        label: "Rookie Class Crystal Clear Autographs",
        kind: "auto",
        variantMeta: meta("Rookie Class Crystal Clear Autographs", CLEAR_AUTO),
        note: "45 张。只在 Hobby 盒与 Hobby Jumbo 盒里出。",
    },
    {
        section: "LEGENDS OF THEIR CLASS CRYSTAL CLEAR AUTOGRAPHS",
        label: "Legends of Their Class Crystal Clear Autographs",
        kind: "auto",
        variantMeta: meta("Legends of Their Class Crystal Clear Autographs", CLEAR_AUTO),
        note: "10 张。只在 Hobby 盒与 Hobby Jumbo 盒里出。",
    },
    {
        section: "SIGNATURE BLEND",
        label: "Signature Blend",
        kind: "auto",
        variantMeta: meta("Signature Blend", INSERT_RAINBOW),
        note: "25 张。",
    },
    {
        section: "SHADOW SCRIPTS",
        label: "Shadow Scripts",
        kind: "auto",
        variantMeta: meta("Shadow Scripts", INSERT_RAINBOW),
        note: "25 张。",
    },
    {
        section: "PENSTROKE SIGNATURES",
        label: "Penstroke Signatures",
        kind: "auto",
        variantMeta: meta("Penstroke Signatures", INSERT_RAINBOW),
        note: "29 张。",
    },
    {
        section: "ETERNAL MARKS",
        label: "Eternal Marks",
        kind: "auto",
        variantMeta: meta("Eternal Marks", INSERT_RAINBOW),
        note: "19 张。",
    },
    {
        section: "MANUSCRIPTS",
        label: "Manuscripts",
        kind: "auto",
        variantMeta: meta("Manuscripts", MANUSCRIPTS),
        note: "70 张。",
    },
    {
        section: "DUAL AUTOGRAPHS",
        label: "Dual Autographs",
        kind: "auto",
        variantMeta: meta("Dual Autographs", MULTI_AUTO),
        note: "15 张，每张两位球员。",
    },
    {
        section: "TRIPLE AUTOGRAPHS",
        label: "Triple Autographs",
        kind: "auto",
        variantMeta: meta("Triple Autographs", MULTI_AUTO),
        note: "10 张，每张三位球员。",
    },
];

export const TSIG26_BASKETBALL_BOXES = assembleBoxes({
    productKey: "tsig26-basketball",
    productName: "2025-26 Topps Signature Class Basketball",
    year: "2025-26",
    releaseDate: "2026-05-28",
    category: "basketball",
    maker: "topps",
    live: true,
    notes: [
        "官方给出的是平均配率，实际开封会有波动，也不保证每个卡人都出现在所有平行里。",
        "官方不公布逐卡配率，本模拟器按子集内等概率分配球员。",
        "普卡分纸质版与折射版两套，卡号范围一样，但球员顺序并不对应。",
        "签名卡每盒的张数是官方规格，本模拟器按平均配率抽取，实际张数会有波动。",
        "追卡：Triple Autographs、Dual Autographs、Legends of Their Class Crystal Clear Autographs。",
    ],
    odds: { columns: PACK_ODDS_COLUMNS, rows: PACK_ODDS },
    sections: ROSTER_SECTIONS,
    subsets: SUBSETS,
    columnNames: {
        hobby: "Hobby",
        "hobby-jumbo": "Hobby Jumbo",
        "value-box": "Value Blaster",
        "mega-box": "Mega",
    },
    boxes: [
        {
            slug: "hobby-box",
            name: "2025-26 Topps Signature Class Basketball Hobby Box",
            column: "hobby",
            cardsPerPack: 4,
            packsPerBox: 8,
            boxesPerCase: 12,
            autoGuaranteed: true,
            residualLabel: "Veteran Class Base",
            boxExclusives: [
                "每盒两张签名卡。",
                "本盒与 Hobby Jumbo 盒独有：Monarchs of the Game、Leviathans、三档 Crystal Clear Autographs。",
                "纸质版的 Blue & Orange、Bronze、Yellow、Coral 四档平行只出在 Value Blaster 盒与 Mega 盒里。",
            ],
        },
        {
            slug: "hobby-jumbo-box",
            name: "2025-26 Topps Signature Class Basketball Hobby Jumbo Box",
            column: "hobby-jumbo",
            cardsPerPack: 10,
            packsPerBox: 4,
            boxesPerCase: 6,
            autoGuaranteed: true,
            residualLabel: "Veteran Class Base",
            boxExclusives: [
                "每盒四张签名卡。",
                "本盒与 Hobby 盒独有：Monarchs of the Game、Leviathans、三档 Crystal Clear Autographs。",
                "纸质版的 Blue & Orange、Bronze、Yellow、Coral 四档平行只出在 Value Blaster 盒与 Mega 盒里。",
            ],
        },
        {
            slug: "value-blaster-box",
            name: "2025-26 Topps Signature Class Basketball Value Blaster Box",
            column: "value-box",
            cardsPerPack: 7,
            packsPerBox: 6,
            boxesPerCase: 40,
            autoGuaranteed: false,
            residualLabel: "Veteran Class Base",
            boxExclusives: [
                "每盒 42 张。",
                "本盒与 Mega 盒独有：Pandora 与 Pandora Yellow 折射平行、Aristocrat、Odyssey、Pressure Points。",
                "纸质版的 Blue & Orange、Bronze、Yellow、Coral 四档平行在本盒里。",
            ],
        },
        {
            slug: "mega-box",
            name: "2025-26 Topps Signature Class Basketball Mega Box",
            column: "mega-box",
            cardsPerPack: 8,
            packsPerBox: 10,
            boxesPerCase: 20,
            autoGuaranteed: false,
            residualLabel: "Veteran Class Base",
            boxExclusives: [
                "每盒两张折射平行。",
                "本盒与 Value Blaster 盒独有：Pandora 与 Pandora Yellow 折射平行、Aristocrat、Odyssey、Pressure Points。",
                "纸质版的 Blue & Orange、Bronze、Yellow、Coral 四档平行在本盒里。",
            ],
        },
    ],
});
