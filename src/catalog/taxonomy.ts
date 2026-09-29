/**
 * 目录种子数据（手写部分）。
 *
 * 这里只声明「规划中」的东西：
 *   - 有哪些品类、每个品类有哪些发行商；
 *   - 还没上线（或还没做拆盒数据）的系列与盒型占位。
 *
 * 已经写好拆盒数据的盒型不需要写在这里 —— 它们在 src/data/sets/ 下注册后
 * 会被 catalog 自动推导出来并标记为已上线。两层合并后再交给前端渲染。
 */

export interface CategorySeed {
    key: string;
    name: string;
    nameEn: string;
    /** 首页图标 key，见 components/CategoryIcon.vue */
    icon: string;
    tagline: string;
    order: number;
    /** 该品类下的发行商（顺序即展示顺序） */
    makers: string[];
    /** 如不写，则根据已注册盒型自动生成 */
    feature?: string;
}

export interface MakerSeed {
    key: string;
    name: string;
    nameEn: string;
}

export interface BoxSeed {
    slug: string;
    name: string;
    note: string;
}

export interface ProductSeed {
    key: string;
    name: string;
    category: string;
    maker: string;
    order: number;
    /** 系列年份，如 "2025-26"；目录按它分组。已注册盒型的年份以盒型数据为准 */
    year: string;
    releaseDate?: string;
    note?: string;
    /** 尚未做拆盒数据的盒型占位 */
    boxes?: BoxSeed[];
}

/** 发行商名称表：key 全局唯一，多处复用 */
export const MAKER_META: Record<string, MakerSeed> = {
    topps: { key: "topps", name: "Topps", nameEn: "Topps" },
    bowman: { key: "bowman", name: "Bowman", nameEn: "Bowman" },
    panini: { key: "panini", name: "Panini", nameEn: "Panini America" },
    fanatics: { key: "fanatics", name: "Fanatics", nameEn: "Fanatics Collectibles" },
    "upper-deck": { key: "upper-deck", name: "Upper Deck", nameEn: "Upper Deck" },
    "pokemon-jp": { key: "pokemon-jp", name: "Pokémon 日版", nameEn: "Pokémon Japan" },
    "pokemon-en": { key: "pokemon-en", name: "Pokémon 英文版", nameEn: "Pokémon International" },
};

export const CATEGORY_SEED: CategorySeed[] = [
    {
        key: "basketball",
        name: "篮球",
        nameEn: "Basketball",
        icon: "basketball",
        tagline: "NBA / 新秀卡 / 平行彩虹",
        order: 1,
        makers: ["topps", "panini", "fanatics", "upper-deck"],
    },
    {
        key: "baseball",
        name: "棒球",
        nameEn: "Baseball",
        icon: "baseball",
        tagline: "MLB / Topps 主线",
        order: 2,
        makers: ["topps", "bowman", "panini"],
    },
    {
        key: "soccer",
        name: "足球",
        nameEn: "Soccer",
        icon: "soccer",
        tagline: "五大联赛 / 世界杯",
        order: 3,
        makers: ["topps", "panini"],
    },
    {
        key: "football",
        name: "橄榄球",
        nameEn: "Football",
        icon: "football",
        tagline: "NFL / 大学橄榄球",
        order: 4,
        makers: ["panini", "topps"],
    },
    {
        key: "tennis",
        name: "网球",
        nameEn: "Tennis",
        icon: "tennis",
        tagline: "四大满贯",
        order: 5,
        makers: ["topps"],
    },
    {
        key: "ufc",
        name: "UFC",
        nameEn: "UFC",
        icon: "ufc",
        tagline: "综合格斗",
        order: 6,
        makers: ["topps"],
    },
    {
        key: "pokemon",
        name: "宝可梦",
        nameEn: "Pokémon",
        icon: "pokemon",
        tagline: "日版 / 英文版扩充包",
        order: 7,
        makers: ["pokemon-jp", "pokemon-en"],
    },
];

/** 规划中的系列；已上线系列的盒型由注册中心提供，这里只补「还没做的盒型」 */
export const PRODUCT_SEED: ProductSeed[] = [
    {
        key: "tcu26-basketball",
        name: "2025-26 Topps Chrome Updates Basketball",
        category: "basketball",
        maker: "topps",
        order: 1,
        year: "2025-26",
        releaseDate: "2026-08-06",
        note: "该系列首个 NBA 版本，官方 Checklist 共 1,299 张卡，分 Hobby / Jumbo / Value / Mega 四种盒型发行。",
        boxes: [],
    },
    {
        key: "topps-chrome-basketball-2526",
        name: "2025-26 Topps Chrome Basketball（主线）",
        category: "basketball",
        maker: "topps",
        order: 2,
        year: "2025-26",
        note: "待上线，敬请期待！",
        boxes: [],
    },
];
