/**
 * 2025-26 Topps Chrome Updates Basketball（篮球 / Topps）。
 *
 * 本目录 = 一个「系列（product）」：
 *   box.ts    该系列各盒型的配率与构造逻辑
 *   roster.ts 官方 Checklist 名单（球员 / 球队 / 新秀标记）
 *   index.ts  对外出口
 *
 * 同系列新增盒型（Hobby / Jumbo / Mega ...）：
 *   在 box.ts 里沿用同一套 SPECS 与 roster，只替换 CARDS_PER_PACK / PACKS_PER_BOX
 *   与各子集的 odds，然后 push 进 TCU26_BASKETBALL_BOXES。
 */
export { TCU26_BASKETBALL_BOXES, ABSENT_SUBSETS } from "./box";
