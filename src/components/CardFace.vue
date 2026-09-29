<script setup lang="ts">
/**
 * 卡面组件。
 *
 * 由于没有真实卡片实物图，统一使用 public/card-art.svg 作为底图，
 * 再按稀有度套用 CSS 滤镜 + 光晕，做出「平行彩虹」的视觉差异。
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
                :style="{ filter: meta.filter }"
                loading="lazy"
            />
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
            <span class="ce-face-tier">{{ meta.name }}</span>
        </div>

        <div class="ce-face-body">
            <p class="ce-face-player">{{ card.player }}</p>
            <p class="ce-face-name">{{ card.fullName }}</p>
            <div class="ce-face-foot">
                <div class="ce-face-meta">
                    <span class="ce-badge">#{{ card.no }}</span>
                    <span v-if="serial" class="ce-badge ce-mono">{{ serial }}</span>
                    <span class="ce-badge ce-mono">{{ card.oddsLabel }}</span>
                </div>
                <TeamIcon :team="card.team" :size="26" />
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

.ce-face-art {
    position: relative;
    aspect-ratio: 5 / 7;
    overflow: hidden;
    background: #0a0f1e;
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

.ce-face-tier {
    position: absolute;
    bottom: 8px;
    left: 8px;
    color: var(--tier);
    border-color: color-mix(in srgb, var(--tier) 55%, transparent);
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

.ce-face-player {
    margin: 0;
    font-weight: 700;
    font-size: 14.5px;
    line-height: 1.3;
}

.ce-face-name {
    margin: 4px 0 0;
    font-size: 12px;
    /* 卡面底色带上了同一色相，字色必须比主色亮一档才压得住 */
    color: color-mix(in srgb, var(--tier) 55%, #ffffff);
    line-height: 1.35;
    min-height: 2.7em;
}

/* 信息行在左、队标在右下角：卡片高度仍然只由文字区决定 */
.ce-face-foot {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: auto;
    padding-top: 8px;
}

.ce-face-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    flex: 1 1 auto;
    min-width: 0;
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
