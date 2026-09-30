/**
 * 价格层类型：盒型购入价 + 卡价模型。
 *
 * 这一层只回答两个问题：
 *   1. 拆这一盒花了多少钱（购入价，按盒型登记）
 *   2. 拆出来的每张卡值多少钱（由档位 / 限量 / 人物推导，见 card-values.ts）
 *
 * 价格来源与实测记录见仓库根目录 `sources/prices/README.md`，
 * 每个条目只引用那里的站点 key，不在这里复述站点信息。
 */

/**
 * 价格可信度 —— 本机能核实到什么程度，决定了这个数字能不能当准数用。
 *   verified  本机实测抓到的价格（来源站点可直接访问）
 *   reference 公开零售报价 / 建议价换算，未在本机复核
 *   estimate  同类盒型的合理估算，没有任何公开报价支撑
 */
export type PriceConfidence = "verified" | "reference" | "estimate";

/** 一个盒型的购入价登记 */
export interface BoxPriceEntry {
    /** boxKey，与 BoxDefinition.key 一致 */
    boxKey: string;
    /** 购入价（RMB，含税到手价口径） */
    cost: number;
    /** 价格来源站点 key，见 sources/prices/README.md 的站点表 */
    source: string;
    /** 该价格的记录日期 (YYYY-MM-DD) */
    asOf: string;
    confidence: PriceConfidence;
    /** 需要额外说明时填，比如「首发溢价已回落」 */
    note?: string;
}

/** 查价站点信息（与 sources/prices/README.md 的站点表一一对应） */
export interface PriceSourceInfo {
    key: string;
    name: string;
    url: string;
    /** 站点类型：卡牌交易 / 行情数据 / 汇率 */
    kind: "market" | "index" | "fx";
    /** 本机实测结论 */
    reachable: boolean;
    note: string;
}

/** 一张卡的价值明细，便于在界面上展开说明「为什么值这么多」 */
export interface CardValueBreakdown {
    /** 最终价值（RMB，已按 ¥0.01 兜底） */
    value: number;
    /** 档位基准价 */
    base: number;
    /** 限量系数 */
    scarcity: number;
    /** 人物系数 */
    player: number;
    /** 命中重点卡（有据可查的实测价）时的实价，否则为 null */
    explicit: number | null;
}
