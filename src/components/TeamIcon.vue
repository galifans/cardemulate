<script setup lang="ts">
/**
 * 球队图标：主色色块 + 三字母缩写。
 *
 * 不使用球队徽标图形（商标问题，见 data/teams.ts），
 * 衬字颜色按底色亮度自动在白 / 深之间切换，省得逐队配文字色。
 */
import { computed } from "vue";
import { teamMeta } from "../data/teams";

const props = defineProps<{ team: string }>();

const meta = computed(() => teamMeta(props.team));

/** WCAG 相对亮度 */
const luminance = (hex: string): number => {
    const value = Number.parseInt(hex.replace("#", ""), 16);
    const channel = (raw: number): number => {
        const c = raw / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return (
        0.2126 * channel((value >> 16) & 255) +
        0.7152 * channel((value >> 8) & 255) +
        0.0722 * channel(value & 255)
    );
};

const ink = computed(() => (luminance(meta.value.color) > 0.42 ? "#0b1020" : "#ffffff"));
</script>

<template>
    <span
        class="ce-team"
        :style="{ '--team': meta.color, '--ink': ink }"
        role="img"
        :aria-label="team"
        :title="team"
    >
        {{ meta.abbr }}
    </span>
</template>

<style scoped>
.ce-team {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 1.5;
    color: var(--ink);
    background: linear-gradient(
        150deg,
        color-mix(in srgb, var(--team) 88%, #ffffff) 0%,
        var(--team) 55%,
        color-mix(in srgb, var(--team) 80%, #000000) 100%
    );
    /* 深色球队（篮网、掘金等）在深色卡面上会和背景糊在一起，留一圈亮边 */
    border: 1px solid rgba(255, 255, 255, 0.22);
}
</style>
