/**
 * 卡片属性标记：卡图下方一排居中的小标签（签字 / 限量编号 / 新秀），
 * 对齐 Topps 电子卡包在卡面上打标的习惯。
 *
 * 全部由已有的卡片字段推导，不新增数据：签字看 group，编号看 numbered，
 * 新秀看 rookie。想加新标记时只改这里，视图不用动。
 */

import type { GroupKind, PulledCard } from "./types";

export type MarkKind = "auto" | "numbered" | "rookie";

/**
 * 签字卡口径：auto 子集是签字，relic 子集（本系列的 NBA Debut Patch）实物卡也全部带签。
 * 卡面标记、拆盒概况、统计页三处都走这个函数，避免各写一套判断。
 */
export const isAutograph = (group: GroupKind): boolean => group === "auto" || group === "relic";

export interface CardMark {
    /** 稳定键，供 v-for 使用 */
    key: MarkKind;
    /** 标记文字，如 "AUTO" / "/99" / "RC" */
    label: string;
    kind: MarkKind;
}

export const cardMarks = (card: PulledCard): CardMark[] => {
    const marks: CardMark[] = [];

    if (isAutograph(card.group)) {
        marks.push({ key: "auto", label: "AUTO", kind: "auto" });
    }

    if (card.numbered !== null) {
        marks.push({
            key: "numbered",
            label: card.numbered === 1 ? "1/1" : `/${card.numbered}`,
            kind: "numbered",
        });
    }

    if (card.rookie) marks.push({ key: "rookie", label: "RC", kind: "rookie" });

    return marks;
};
