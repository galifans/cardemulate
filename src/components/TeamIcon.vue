<script setup lang="ts">
/**
 * 球队图标：优先显示队标，加载不出来时退化成主色缩写块。
 *
 * 退化不是可有可无的兜底——历史球队（西雅图超音速）与名册里的非球队值
 * （Entertainer）本来就没有队标，另外图床偶发失败也不该在卡片上留一个破图标。
 */
import { computed, ref, watch } from "vue";
import { teamLogo, teamMeta } from "../data/teams";

const props = withDefaults(
    defineProps<{
        team: string;
        /** 图标边长，像素 */
        size?: number;
    }>(),
    { size: 26 },
);

const meta = computed(() => teamMeta(props.team));
const src = computed(() => teamLogo(props.team));
const failed = ref(false);

/** 换了球队就重新给队标一次机会，否则复用组件时会一直显示上一张的兜底 */
watch(src, () => {
    failed.value = false;
});
</script>

<template>
    <span
        class="ce-team"
        role="img"
        :aria-label="team"
        :title="team"
        :style="{ '--team': meta.color, width: `${size}px`, height: `${size}px` }"
    >
        <img
            v-if="src && !failed"
            class="ce-team-logo"
            :src="src"
            alt=""
            loading="lazy"
            @error="failed = true"
        />
        <span v-else class="ce-team-abbr">{{ meta.abbr }}</span>
    </span>
</template>

<style scoped>
.ce-team {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    /* 队标多为深色描线，浅底圆圈能把轮廓和深色卡面分开 */
    border: 1px solid rgba(255, 255, 255, 0.35);
    overflow: hidden;
}

.ce-team-logo {
    width: 88%;
    height: 88%;
    object-fit: contain;
    display: block;
}

.ce-team-abbr {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1;
    color: #0b1020;
}
</style>
