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
    /** 紧凑模式：统计列表里用 */
    compact?: boolean;
}>();

const meta = computed(() => TIERS[props.card.tier]);

/** 卡图下方那排标记：签字 / 限量编号 / 新秀 */
const marks = computed(() => cardMarks(props.card));

/** 具体到手的那一张：限量卡的流水号 */
const serial = computed(() => {
    if (props.card.numbered === null) return "";
    if (props.card.numbered === 1) return "1 / 1";
    return `${props.card.serial ?? "-"} / ${props.card.numbered}`;
});
</script>

<template>
    <article class="ce-face" :class="{ compact }" :style="{ '--tier': meta.color, '--glow': meta.glow }">
        <div class="ce-face-art">
            <img
                src="/card-art.svg"
                :alt="`${card.fullName} - ${card.player}`"
                :style="{ filter: meta.filter }"
                loading="lazy"
            />
            <span class="ce-face-sheen" aria-hidden="true"></span>
            <span class="ce-face-tier">{{ meta.name }}</span>
        </div>

        <div v-if="!compact && marks.length" class="ce-face-marks">
            <span
                v-for="mark in marks"
                :key="mark.key"
                class="ce-mark"
                :class="`ce-mark-${mark.kind}`"
            >
                {{ mark.label }}
            </span>
        </div>

        <div class="ce-face-body">
            <p class="ce-face-player">{{ card.player }}</p>
            <div class="ce-face-team">
                <TeamIcon :team="card.team" />
            </div>
            <p class="ce-face-name">{{ card.fullName }}</p>
            <div class="ce-face-meta">
                <span class="ce-badge">#{{ card.no }}</span>
                <span v-if="serial" class="ce-badge ce-mono">{{ serial }}</span>
                <span class="ce-badge ce-mono">{{ card.oddsLabel }}</span>
                <span v-if="!compact" class="ce-badge">第 {{ card.pack }} 包</span>
            </div>
        </div>
    </article>
</template>

<style scoped>
.ce-face {
    --tier: #8b95a8;
    --glow: 0;
    background: linear-gradient(165deg, var(--ce-panel) 0%, var(--ce-bg-soft) 100%);
    border: 1px solid color-mix(in srgb, var(--tier) 40%, var(--ce-border-soft));
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
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 7px;
    backdrop-filter: blur(6px);
    border: 1px solid color-mix(in srgb, var(--tier) 55%, transparent);
    background: rgba(4, 8, 18, 0.7);
    color: var(--tier);
    font-weight: 600;
}

.ce-face-marks {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    padding: 9px 12px 0;
}

.ce-mark {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 1.6;
    padding: 1px 9px;
    border-radius: 999px;
    border: 1px solid;
}

.ce-mark-auto {
    color: #ffc870;
    border-color: rgba(255, 181, 71, 0.55);
    background: rgba(255, 181, 71, 0.12);
}

.ce-mark-numbered {
    color: #cbaaff;
    border-color: rgba(180, 135, 255, 0.55);
    background: rgba(180, 135, 255, 0.12);
}

.ce-mark-rookie {
    color: #7dbcff;
    border-color: rgba(90, 169, 255, 0.55);
    background: rgba(90, 169, 255, 0.12);
}

.ce-face-body {
    padding: 11px 12px 13px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
}

.ce-face-player {
    margin: 0;
    font-weight: 700;
    font-size: 14.5px;
    line-height: 1.3;
}

.ce-face-team {
    display: flex;
}

.ce-face-name {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--tier);
    line-height: 1.35;
    min-height: 2.7em;
}

.ce-face-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: auto;
    padding-top: 8px;
}

.compact {
    flex-direction: row;
    align-items: stretch;
}

.compact .ce-face-art {
    width: 84px;
    aspect-ratio: 5 / 7;
    flex-shrink: 0;
}

.compact .ce-face-body {
    padding: 10px 12px;
}

.compact .ce-face-name {
    min-height: 0;
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
