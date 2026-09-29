<script setup lang="ts">
/**
 * 卡面组件。
 *
 * 由于没有真实卡片实物图，统一使用 public/card-art.svg 作为底图，
 * 再把稀有度主色混进卡图与卡面，做出「平行彩虹」的视觉差异。
 * 染色只能用 --tier：CSS 滤镜在这么暗的底图上转不出色相（见 .ce-face-art 注释）。
 */
import { computed } from "vue";
import type { PulledCard } from "../engine/types";
import { TIERS } from "../engine/tiers";
import { cardMarks } from "../engine/marks";
import TeamIcon from "./TeamIcon.vue";

const props = defineProps<{
    card: PulledCard;
}>();

const meta = computed(() => TIERS[props.card.tier]);

/** 卡图左上角的标记：签字 / 限量编号 / 新秀 */
const marks = computed(() => cardMarks(props.card));

/** 具体到手的那一张：限量卡的流水号 */
const serial = computed(() => {
    if (props.card.numbered === null) return "";
    if (props.card.numbered === 1) return "1 / 1";
    return `${props.card.serial ?? "-"} / ${props.card.numbered}`;
});
</script>

<template>
    <article class="ce-face" :style="{ '--tier': meta.color, '--glow': meta.glow }">
        <div class="ce-face-art">
            <img
                src="/card-art.svg"
                :alt="`${card.fullName} - ${card.player}`"
                loading="lazy"
            />
            <span class="ce-face-hue" aria-hidden="true"></span>
            <span class="ce-face-lift" aria-hidden="true"></span>
            <span class="ce-face-sheen" aria-hidden="true"></span>
            <div v-if="marks.length" class="ce-face-marks">
                <span
                    v-for="mark in marks"
                    :key="mark.key"
                    class="ce-mark"
                    :class="`ce-mark-${mark.kind}`"
                >
                    {{ mark.label }}
                </span>
            </div>
            <div class="ce-face-bar">
                <span class="ce-face-tier">{{ meta.name }}</span>
                <TeamIcon class="ce-face-team" :team="card.team" />
            </div>
        </div>

        <div class="ce-face-body">
            <p class="ce-face-player" :title="card.player">{{ card.player }}</p>
            <p class="ce-face-name" :title="card.fullName">{{ card.fullName }}</p>
            <div class="ce-face-meta">
                <span class="ce-badge">#{{ card.no }}</span>
                <span v-if="serial" class="ce-badge ce-mono">{{ serial }}</span>
                <span class="ce-badge ce-mono" :title="card.oddsLabel">{{ card.oddsLabel }}</span>
            </div>
        </div>
    </article>
</template>

<style scoped>
.ce-face {
    --tier: #8b95a8;
    --glow: 0;
    background: linear-gradient(165deg, var(--ce-panel) 0%, var(--ce-bg-soft) 100%);
    border: 1px solid color-mix(in srgb, var(--tier) 52%, var(--ce-border-soft));
    border-radius: var(--ce-radius);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.38),
        0 0 calc(2px + var(--glow) * 26px) color-mix(in srgb, var(--tier) calc(var(--glow) * 70%), transparent);
    animation: ce-pop 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

/*
 * 占位底图是深蓝紫的（hue 250°、明度不到一成就被裁黑），
 * 用 CSS filter 的 hue-rotate 转它，负系数先被裁到 0，转出来的既不是档位色也会发绿。
 * 所以色相一律由 --tier 通过混色层给：底图只贡献明暗和纹理。
 */
.ce-face-art {
    position: relative;
    aspect-ratio: 5 / 7;
    overflow: hidden;
    /* 底图没加载出来时也不该露出面板蓝底 */
    background: color-mix(in srgb, var(--tier) 30%, #0a0f1e);
    /* 混色层只跟卡图内部叠，不往外溢到卡身 */
    isolation: isolate;
}

.ce-face-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
}

.ce-face:hover .ce-face-art img {
    transform: scale(1.04);
}

/* 取走底图的明暗，色相与饱和度整份换成 --tier：「金卡一眼是金」就靠这一层 */
.ce-face-hue {
    position: absolute;
    inset: 0;
    background: var(--tier);
    mix-blend-mode: color;
    pointer-events: none;
}

/* 越稀有的档位加得越亮，强度直接取档位的 --glow，不另配一套数值 */
.ce-face-lift {
    position: absolute;
    inset: 0;
    background: var(--tier);
    mix-blend-mode: screen;
    opacity: calc(0.06 + var(--glow) * 0.6);
    pointer-events: none;
}

.ce-face-sheen {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        105deg,
        transparent 30%,
        color-mix(in srgb, var(--tier) 26%, transparent) 45%,
        rgba(255, 255, 255, 0.42) 50%,
        color-mix(in srgb, var(--tier) 26%, transparent) 55%,
        transparent 70%
    );
    background-size: 260% 100%;
    background-position: 130% 0;
    animation: ce-sheen 4.5s ease-in-out infinite;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: calc(0.25 + var(--glow));
}

/*
 * 卡图自己的一条底栏：档位药丸在左、队标在右。
 * 两者同一行靠同一条 flex 撑着，各自绝对定位迟早会飘开。
 * 队标画在这里而不是文字区，是因为「卡片」指的是这张卡图，
 * 下面的球员名 / 卡种是卡片信息，不算卡面。
 */
.ce-face-bar {
    position: absolute;
    inset: auto 8px 8px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    pointer-events: none;
}

.ce-face-tier {
    color: var(--tier);
    border-color: color-mix(in srgb, var(--tier) 55%, transparent);
    /* 底栏宽度有限：档位名过长时宁可裁掉，也不能折行把队标挤出去 */
    overflow: hidden;
}

/* 标记堆在卡图左上角：放到卡片下方会随张数换行，不同卡的行高就不齐了 */
.ce-face-marks {
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
}

.ce-face-tier,
.ce-mark {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    padding: 2px 8px;
    border-radius: 7px;
    backdrop-filter: blur(6px);
    border: 1px solid;
    background: rgba(4, 8, 18, 0.72);
    white-space: nowrap;
}

.ce-mark-auto {
    color: #ffc870;
    border-color: rgba(255, 181, 71, 0.6);
}

.ce-mark-numbered {
    color: #cbaaff;
    border-color: rgba(180, 135, 255, 0.6);
}

.ce-mark-rookie {
    color: #7dbcff;
    border-color: rgba(90, 169, 255, 0.6);
}

.ce-face-body {
    padding: 11px 12px 13px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    /* 卡面底色跟着稀有度走：金卡一眼是金，红卡一眼是红 */
    background: linear-gradient(
        160deg,
        color-mix(in srgb, var(--tier) 46%, var(--ce-panel)) 0%,
        color-mix(in srgb, var(--tier) 24%, var(--ce-bg-soft)) 100%
    );
}

/*
 * 文字区三块都是「固定行数」：球员名 1 行、卡名 2 行、角标 1 行。
 * 内容长短不一（子集名能差到 33 个字符、拿長名字的球员也有），
 * 一旦按内容自由换行，同一排卡片的下沿就参差不齐，一眼看过去就是没对齐。
 * 所以宁可截断也不折行，完整文字走 title 提示。
 */
.ce-face-player {
    margin: 0;
    font-weight: 700;
    font-size: 14.5px;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ce-face-name {
    margin: 4px 0 0;
    font-size: 12px;
    /* 卡面底色带上了同一色相，字色必须比主色亮一档才压得住 */
    color: color-mix(in srgb, var(--tier) 55%, #ffffff);
    line-height: 1.35;
    /* min-height 与行数上限必须对得上，否则短名的卡会变矮 */
    min-height: 2.7em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
}

/*
 * 角标行：只占一行，一行高固定。放不下时**统一让最后一个让位**——
 * 底栏信息本来就是按重要性排的，配率最短的写法也比编号次要，
 * 所以只有它允许被压窄、用省略号收尾，前面几个不许缩（缩成一排省略号更难看）。
 */
.ce-face-meta {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
    margin-top: auto;
    padding-top: 8px;
    overflow: hidden;
}

/* inline-block 才能让 text-overflow 生效（inline-flex 会把文字包成匿名项） */
.ce-face-meta .ce-badge {
    flex: 0 0 auto;
    display: inline-block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
    vertical-align: middle;
}

.ce-face-meta .ce-badge:last-child {
    flex-shrink: 1;
}

@keyframes ce-pop {
    from {
        opacity: 0;
        transform: translateY(14px) scale(0.94);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@keyframes ce-sheen {
    0%,
    62% {
        background-position: 130% 0;
    }
    100% {
        background-position: -60% 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .ce-face,
    .ce-face-sheen {
        animation: none;
    }
}
</style>
