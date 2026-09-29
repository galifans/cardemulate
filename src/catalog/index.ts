/**
 * 目录层入口：把「规划中的种子数据」与「已注册的盒型数据」合并成前端直接可用的目录。
 *
 * 分层关系：
 *   data/sets/**  ->  盒型与配率（engine 层可拆的完整数据）
 *   catalog/**    ->  品类 / 发行商 / 系列 / 盒型的导航目录（由上面自动推导）
 *   views/**      ->  只读目录 + engine，不写死任何具体盒型
 *
 * 扩展方式：
 *   新盒型  -> 在 data/sets/<category>/<maker>/<product>/ 下写数据并 registerBox()
 *   新系列  -> 同上；如需占位（待上线）则在 taxonomy.ts 的 PRODUCT_SEED 里加一条
 *   新品类  -> taxonomy.ts 的 CATEGORY_SEED 加一条，必要时补 CategoryIcon 图标
 */
import type { BoxDefinition } from "../engine/types";
import { boxList, boxByKey } from "./registry";
import { CATEGORY_SEED, MAKER_META, PRODUCT_SEED } from "./taxonomy";
import type { BoxRef, CategoryDef, MakerDef, ProductDef, YearGroupDef } from "./types";

/* 副作用导入：触发 src/data/sets 下全部盒型注册 */
import "../data/sets";

/** 全部已注册盒型 */
const ALL_BOXES: BoxDefinition[] = boxList();

const boxesOf = (filter: { category?: string; maker?: string; productKey?: string }): BoxDefinition[] =>
    ALL_BOXES.filter(
        (box) =>
            (filter.category === undefined || box.category === filter.category) &&
            (filter.maker === undefined || box.maker === filter.maker) &&
            (filter.productKey === undefined || box.productKey === filter.productKey),
    );

/** 盒型 -> 目录条目 */
const toBoxRef = (box: BoxDefinition): BoxRef => ({
    ref: box.key,
    slug: box.slug,
    name: box.name,
    live: box.live,
});

/* ------------------------------------------------------------------ */
/* 品类                                                                 */
/* ------------------------------------------------------------------ */

export const CATEGORIES: CategoryDef[] = CATEGORY_SEED.slice()
    .sort((a, b) => a.order - b.order)
    .map((seed) => {
        const registered = boxesOf({ category: seed.key });
        const live = registered.filter((box) => box.live);
        return {
            key: seed.key,
            name: seed.name,
            nameEn: seed.nameEn,
            icon: seed.icon,
            tagline: seed.tagline,
            order: seed.order,
            live: live.length > 0,
            feature:
                seed.feature ??
                (live.length
                    ? `已上线：${live.map((box) => box.name).join(" / ")}（按盒拆）`
                    : undefined),
            boxCount: registered.length,
        };
    });

/* ------------------------------------------------------------------ */
/* 发行商                                                               */
/* ------------------------------------------------------------------ */

function deriveMakers(category: string): MakerDef[] {
    const registered = boxesOf({ category });
    const declared = CATEGORY_SEED.find((item) => item.key === category)?.makers ?? [];
    const extra = Array.from(new Set(registered.map((box) => box.maker))).filter(
        (key) => !declared.includes(key),
    );

    return [...declared, ...extra].map((key, index) => {
        const meta = MAKER_META[key] ?? { key, name: key, nameEn: key };
        const own = registered.filter((box) => box.maker === key);
        const live = own.filter((box) => box.live);
        return {
            key,
            name: meta.name,
            nameEn: meta.nameEn,
            order: index + 1,
            live: live.length > 0,
            note: live.length ? `已上线 ${live.length} 个盒型` : "待上线，敬请期待！",
            boxCount: own.length,
        };
    });
}

export const MAKERS: Record<string, MakerDef[]> = Object.fromEntries(
    CATEGORY_SEED.map((seed) => [seed.key, deriveMakers(seed.key)]),
);

/* ------------------------------------------------------------------ */
/* 系列与盒型                                                            */
/* ------------------------------------------------------------------ */

/**
 * 年份排序键："2025-26" -> 2025。跨年赛季取起始年份，
 * 所以 "2026" 这种单年系列会排在 "2025-26" 前面（它晚一年上市）。
 */
export const yearStart = (year: string): number => Number(year.slice(0, 4));

function defaultProductNote(boxes: BoxDefinition[], productKey: string): string {
    const subsets = new Set<string>();
    let variants = 0;
    for (const box of boxes) {
        variants += box.variants.length;
        for (const subset of box.subsets) subsets.add(`${box.key}/${subset.key}`);
    }
    if (!boxes.length) return "待上线，敬请期待！";
    return `${boxes.length} 个盒型 · ${subsets.size} 个子集 · ${variants} 个卡种（${productKey}）`;
}

function deriveProducts(category: string, maker: string): ProductDef[] {
    const boxes = boxesOf({ category, maker });
    const seeds = PRODUCT_SEED.filter((item) => item.category === category && item.maker === maker);
    const keys = Array.from(new Set([...seeds.map((item) => item.key), ...boxes.map((box) => box.productKey)]));

    return keys
        .map((key, index) => {
            const seed = seeds.find((item) => item.key === key);
            const own = boxes.filter((box) => box.productKey === key);
            const registered = own.map(toBoxRef);
            const planned: BoxRef[] = (seed?.boxes ?? [])
                .filter((item) => !own.some((box) => box.slug === item.slug))
                .map((item) => ({
                    ref: `${category}.${maker}.${key}.${item.slug}`,
                    slug: item.slug,
                    name: item.name,
                    live: false,
                    note: item.note,
                }));

            return {
                key,
                name: seed?.name ?? own[0]?.productName ?? key,
                category,
                maker,
                order: seed?.order ?? 100 + index,
                live: own.some((box) => box.live),
                year: seed?.year ?? own[0]?.year ?? "",
                releaseDate: seed?.releaseDate ?? own[0]?.releaseDate,
                note: seed?.note ?? defaultProductNote(own, key),
                boxes: [...registered, ...planned],
            };
        })
        // 年份新的在前；同一年内按 order，再按名字兜底
        .sort(
            (a, b) =>
                yearStart(b.year) - yearStart(a.year) ||
                a.order - b.order ||
                a.name.localeCompare(b.name),
        );
}

/* ------------------------------------------------------------------ */
/* 查询接口                                                             */
/* ------------------------------------------------------------------ */

export const findCategory = (key: string): CategoryDef | undefined =>
    CATEGORIES.find((item) => item.key === key);

export const findMakers = (category: string): MakerDef[] => MAKERS[category] ?? [];

export const findMaker = (category: string, maker: string): MakerDef | undefined =>
    findMakers(category).find((item) => item.key === maker);

export const findProducts = (category: string, maker: string): ProductDef[] =>
    deriveProducts(category, maker);

export const findProduct = (category: string, maker: string, key: string): ProductDef | undefined =>
    findProducts(category, maker).find((item) => item.key === key);

/**
 * 某发行商下的系列按年份分组，新的年份在前。
 * 直接切段而不是重新排序 —— findProducts 已经按年份排好了。
 */
export const findYearGroups = (category: string, maker: string): YearGroupDef[] => {
    const groups: YearGroupDef[] = [];
    for (const product of findProducts(category, maker)) {
        const last = groups[groups.length - 1];
        if (last && last.year === product.year) last.products.push(product);
        else groups.push({ year: product.year, products: [product] });
    }
    return groups;
};

/** 全部盒型 */
export const allBoxes = (): BoxDefinition[] => ALL_BOXES.slice();

/** 只有已上线的盒型 */
export const allLiveBoxes = (): BoxDefinition[] => ALL_BOXES.filter((box) => box.live);

/** 按 key 取盒型 */
export const getBox = (key: string): BoxDefinition | undefined => boxByKey(key);

/** 目录规模概览，用于首页/文档 */
export const catalogSummary = () => ({
    categories: CATEGORIES.length,
    liveCategories: CATEGORIES.filter((item) => item.live).length,
    makers: new Set(CATEGORIES.flatMap((item) => findMakers(item.key).map((maker) => `${item.key}/${maker.key}`)))
        .size,
    products: ALL_BOXES.length
        ? new Set(ALL_BOXES.map((box) => `${box.category}/${box.maker}/${box.productKey}`)).size
        : 0,
    boxes: ALL_BOXES.length,
    liveBoxes: ALL_BOXES.filter((box) => box.live).length,
    variants: ALL_BOXES.reduce((sum, box) => sum + box.variants.length, 0),
});
