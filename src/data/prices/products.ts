/**
 * 系列档次系数 —— 卡价模型里唯一的「跨系列」变量。
 *
 * 为什么需要一个系数
 * ------------------
 * 卡价模型只认 档位 / 限量 / 人物 三件事，这三件事在同一个系列内部是准的，
 * 但跨系列就不够用：同样是「非编号的银色折射」，Cosmic Chrome 的比旗舰 Topps
 * 的贵一截，而 Topps 3 一盒只有 4 张、张张带限量，单张自然更贵。这个差异
 * 来自系列本身的市场认可度，模型里没有别的变量能表达它，所以单独登记。
 *
 * 系数怎么来的
 * ------------
 * 用手上能核到的盒价反推：跑 `npm run prices:check`，把每个系列的回本率
 * 调到 45%~60% 之间，记下需要的倍数。也就是说这个表是**标定值**，
 * 不是从任何官方资料抄来的；在 sources/prices/README.md 里也是这样交代的。
 *
 * 没登记的系列按 1 倍处理，新系列上线不会因为漏登记而出错。
 */
export const PRODUCT_VALUE_FACTORS: Record<string, number> = {
    "tcu26-basketball": 1.45,
    "tccj26-basketball": 4.2,
    "tcosmic26-basketball": 3.1,
    "tthree26-basketball": 0.62,
    "tfinest26-basketball": 1,
    "tsig26-basketball": 1.15,
    "tbb26-basketball": 0.95,
    "thoops26-basketball": 1.05,
};

/** 取系列档次系数 */
export const productValueFactor = (productKey: string): number =>
    PRODUCT_VALUE_FACTORS[productKey] ?? 1;
