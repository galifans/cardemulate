/**
 * CardEmulate 核心数据类型
 *
 * 设计目标：把「一套卡牌盒」完整描述为一组数据（子集 + 平行 + 官方配率），
 * 拆盒引擎只依赖这里的类型，新增卡盒时只需补一份数据文件。
 */

/** 稀有度档位（用于卡面光效与统计分组） */
export type Tier = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

/** 子集大类 */
export type GroupKind = "base" | "parallel" | "insert" | "auto" | "relic" | "ssp";

/** 一张具体卡（球员/人物） */
export interface Subject {
    /** 卡号（如 "151"、"YQ-1"、"TCA-CF"） */
    no: string;
    /** 人物名 */
    player: string;
    /** 球队 */
    team: string;
    /** 是否新秀卡 */
    rookie?: boolean;
}

/** 子集（Checklist 里的一段，如 "Clutch City"、"New Editions"） */
export interface SubsetDef {
    /** 唯一键，如 "clutch-city" */
    key: string;
    /** 展示名，如 "Clutch City" */
    name: string;
    /** 卡号前缀（可选） */
    code?: string;
    kind: GroupKind;
    /** 是否有逐卡名册；false 时按「通用卡」展示 */
    detailed: boolean;
    /** 该子集在本盒中是否可开出 */
    inBox: boolean;
    /** 名册（detailed=false 时为空数组） */
    subjects: Subject[];
    note?: string;
}

/** 一个「卡种」= 子集 × 平行版本（拆盒的最小单位） */
export interface VariantDef {
    /** 唯一键，`${subsetKey}:${slug}` */
    key: string;
    /** 所属子集 key */
    subset: string;
    /** 子集展示名 */
    subsetName: string;
    /** 平行名（空字符串表示子集本身的普通版） */
    variantName: string;
    /** 完整展示名 */
    fullName: string;
    /** 大类 */
    group: GroupKind;
    /** 稀有度 */
    tier: Tier;
    /** 官方配率：1:X（每包）；0 表示由权重残差自动计算的「普通 Base」 */
    odds: number;
    /** 限量数；null = 非编号 */
    numbered: number | null;
    /** 在本次拆盒权重表中的抽样权重 */
    weight: number;
}

/** 一个卡盒（如 "2025-26 Topps Chrome Updates Basketball Value Box"）
 *
 * 命名约定（多项目 / 多品类 / 多盒型扩展的基础）：
 *   box.key = `${category}.${maker}.${productKey}.${slug}`
 * 例如 `basketball.topps.tcu26-basketball.value-box`。
 * 该 key 全局唯一，直接作为数据库里的 box_key。
 */
export interface BoxDefinition {
    /** 唯一键，派生自 category + maker + productKey + slug */
    key: string;
    /** 盒型 slug，如 "value-box" / "hobby-box" */
    slug: string;
    /** 展示名 */
    name: string;
    /** 品类 key，如 "basketball" */
    category: string;
    /** 发行商 key，如 "topps" */
    maker: string;
    /** 所属系列/产品 key，如 "tcu26-basketball" */
    productKey: string;
    /** 所属系列/产品展示名，如 "2025-26 Topps Chrome Updates Basketball" */
    productName: string;
    /** 是否已上线可拆；false 时前端灰化显示「待上线，敬请期待！」 */
    live: boolean;
    /** 上市日期 (YYYY-MM-DD) */
    releaseDate: string;
    /** 每包张数 */
    cardsPerPack: number;
    /** 每盒包数 */
    packsPerBox: number;
    /** 每箱盒数；0 = 官方未公布 */
    boxesPerCase: number;
    /** 是否有签名保证 */
    autoGuaranteed: boolean;
    /** 该盒独家的内容说明 */
    boxExclusives: string[];
    /** 备注 */
    notes: string[];
    /** 本盒不含（只在其他盒型里出）的子集，用于对比说明 */
    absentSubsets: AbsentEntry[];
    /** 子集表 */
    subsets: SubsetDef[];
    /** 卡种表（含权重） */
    variants: VariantDef[];
    /** 普通 Base 的残差权重（每包预期出现的「纯 Base」张数） */
    baseWeight: number;
}

/** 本盒不含、但同系列其他盒型有的子集 */
export interface AbsentEntry {
    name: string;
    code: string;
    count: number;
    /** 出现在哪些盒型里 */
    where: string;
    kind: GroupKind;
}

/** 拆出的一张卡（含实例化的球员信息） */
export interface PulledCard {
    /** 实例 id */
    id: string;
    variantKey: string;
    fullName: string;
    subsetKey: string;
    subsetName: string;
    variantName: string;
    group: GroupKind;
    tier: Tier;
    player: string;
    team: string;
    no: string;
    rookie: boolean;
    numbered: number | null;
    /** 模拟到的具体编号（如 37/99） */
    serial: number | null;
    /** 配率文案，如 "1:1,737" */
    oddsLabel: string;
    odds: number;
    /** 出自第几包（1 起） */
    pack: number;
    /** 包内第几张（1 起） */
    slot: number;
}
