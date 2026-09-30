/**
 * 价格层出口：盒型购入价 + 卡价模型。
 *
 * 上层（engine / views）只从这里取价格，不直接读 boxes.ts / card-values.ts，
 * 这样换价格来源或改模型都不用动视图。
 */
import type { BoxDefinition } from "@/engine/types";
import { BOX_PRICES, PRICE_AS_OF, PRICE_SOURCES, USD_CNY } from "./boxes";
import { sumValueRmb } from "./card-values";
import type { BoxPriceEntry, PriceSourceInfo } from "./types";

export { BOX_PRICES, PRICE_AS_OF, PRICE_SOURCES, USD_CNY };
export { cardValueBreakdown, cardValueRmb, FLOOR_VALUE, sumValueRmb } from "./card-values";
export { PRODUCT_VALUE_FACTORS, productValueFactor } from "./products";
export type { BoxPriceEntry, CardValueBreakdown, PriceConfidence, PriceSourceInfo } from "./types";

/** boxKey -> 购入价条目 */
const BY_BOX = new Map<string, BoxPriceEntry>(BOX_PRICES.map((row) => [row.boxKey, row]));

/** 取盒型的购入价条目 */
export const boxPriceEntry = (boxKey: string): BoxPriceEntry | undefined => BY_BOX.get(boxKey);

/** 盒型购入价（RMB）；没登记过就是 0，界面上显示成「—」 */
export const boxCostRmb = (boxKey: string): number => BY_BOX.get(boxKey)?.cost ?? 0;

/** 按盒型定义取购入价 */
export const boxCostOf = (box: BoxDefinition): number => boxCostRmb(box.key);

/** 按盒型定义算一盒的实际售出额 */
export const boxValueOf = (box: BoxDefinition, cards: Parameters<typeof sumValueRmb>[0]): number =>
    sumValueRmb(cards, box.productKey);

/** 价格来源站点 */
export const priceSource = (key: string): PriceSourceInfo | undefined =>
    PRICE_SOURCES.find((row) => row.key === key);

/** 某个盒型的价格来源站点 */
export const boxPriceSource = (boxKey: string): PriceSourceInfo | undefined => {
    const row = BY_BOX.get(boxKey);
    return row ? priceSource(row.source) : undefined;
};

/** 全部已登记购入价的盒型 key */
export const pricedBoxKeys = (): string[] => BOX_PRICES.map((row) => row.boxKey);

/** 收益概览：用于本盒概况与统计页 */
export interface ProfitSummary {
    /** 购入（RMB） */
    cost: number;
    /** 售出（RMB） */
    value: number;
    /** 净收益（RMB），可为负 */
    net: number;
    /** 回本率：售出 / 购入，购入为 0 时为 null */
    ratio: number | null;
}

/** 组装收益概览 */
export function profitSummary(cost: number, value: number): ProfitSummary {
    const net = Math.round((value - cost) * 100) / 100;
    return {
        cost: Math.round(cost * 100) / 100,
        value: Math.round(value * 100) / 100,
        net,
        ratio: cost > 0 ? value / cost : null,
    };
}

/**
 * 金额一律两位小数，负数写成 -¥12.34 而不是 ¥-12.34。
 * 卡价下限是 0.01 元，所以小数位不能省 —— 否则一屏卡全是「¥0」。
 */
export const rmb = (value: number): string => {
    const sign = value < 0 ? "-" : "";
    return `${sign}¥${Math.abs(value).toFixed(2)}`;
};

/**
 * 同上，但 0 显示成「—」。盒型没登记价格、以及价格表上线前的老记录都是 0，
 * 写成「¥0.00」会被误读成「这盒不要钱」。
 */
export const rmbOrDash = (value: number): string => (value > 0 ? rmb(value) : "—");
