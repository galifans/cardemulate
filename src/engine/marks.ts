/**
 * 卡片属性标记：卡图下方一排居中的小标签（签字 / 限量编号 / 新秀），
 * 对齐 Topps 电子卡包在卡面上打标的习惯。
 *
 * 全部由已有的卡片字段推导，不新增数据：签字看 group，编号看 numbered，
 * 新秀看 rookie。想加新标记时只改这里，视图不用动。
 */

import type { PulledCard } from "./types";

export type MarkKind = "auto" | "numbered" | "rookie";

export interface CardMark {
    /** 稳定键，供 v-for 使用 */
    key: MarkKind;
    /** 标记文字，如 "AUTO" / "/99" / "RC" */
    label: string;
    kind: MarkKind;
}

export const cardMarks = (card: PulledCard): CardMark[] => {
    const marks: CardMark[] = [];

    // 本系列的实物卡（NBA Debut Patch Autographs）全部带签，
    // 与「本盒概况」里签字卡的口径保持一致
    if (card.group === "auto" || card.group === "relic") {
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
