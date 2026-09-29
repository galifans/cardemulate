/**
 * 2025-26 Topps Chrome Updates Basketball（篮球 / Topps）。
 *
 * 本目录 = 一个「系列（product）」：
 *   box.ts           该系列各盒型的构造逻辑（按官方 Pack Odds 表逐列投影）
 *   roster.ts        官方 Checklist 名单（球员 / 球队 / 新秀标记）
 *   pack-odds.generated.ts  官方配率表（自动生成，勿手改）
 *   index.ts         对外出口
 *
 * 同系列新增盒型：在 box.ts 的 BOX_CONFIGS 里加一条，指定官方表里的列名
 * 与包装规格即可，不用再抄一遍配率。
 */
export { TCU26_BASKETBALL_BOXES } from "./box";
