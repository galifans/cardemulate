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
 * 两步走，缺一不可。
 *
 * 一、形状来自真实成交价。卡淘（cardhobby.com.cn）有一个不用登录的检索接口
 *    `/NewCommodity/SearchCommodity`，`searchJson=[{"Key":"Status","Value":-2}]`
 *    取「已售出」记录，`LowestPrice` 就是成交价。用它按系列分组算出的
 *    「出价 ≥2 次的成交价中位数」之比，就是下面这张表的相对形状。
 *    取样口径见 sources/prices/README.md。
 *
 * 二、水位由盒价钉住。成交价是国内二级市场的，盒价是北美零售的，两者绝对
 *    水位差 2~8 倍；直接照搬会让回本率冲到 120% 以上（密封盒不可能长期回本
 *    超过 100%）。所以把上面那组比值整体缩放一个系数，让回本率中位数保持
 *    在 50% 附近 —— 这一步只改整体水位，不改系列之间的比例。
 *
 * 所以这个表是**标定值**，不是从任何官方资料抄来的。改完必须跑
 * `npm run prices:check` 复核回本率区间；样本不够的系列（Topps Three 几乎
 * 全是签名卡）留下来按老值，不要凭感觉调。
 *
 * 没登记的系列按 1 倍处理，新系列上线不会因为漏登记而出错。
 */
export const PRODUCT_VALUE_FACTORS: Record<string, number> = {
    "tcu26-basketball": 1.324,
    "tccj26-basketball": 3.903,
    "tcosmic26-basketball": 2.186,
    "tthree26-basketball": 0.62,
    "tfinest26-basketball": 1.483,
    "tsig26-basketball": 1.126,
    "tbb26-basketball": 0.578,
    "thoops26-basketball": 0.961,
};

/** 取系列档次系数 */
export const productValueFactor = (productKey: string): number =>
    PRODUCT_VALUE_FACTORS[productKey] ?? 1;
