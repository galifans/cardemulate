<script setup lang="ts">
/**
 * 分类图标：全部为内置 SVG（站点不使用 emoji）。
 */
defineProps<{
    name: string;
    size?: number;
}>();

const PATHS: Record<string, { viewBox: string; paths: string[]; circles?: [number, number, number][] }> = {
    basketball: {
        viewBox: "0 0 24 24",
        paths: [
            "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
            "M12 3v18",
            "M3 12h18",
            "M5.6 5.6c3.6 3.6 3.6 9.2 0 12.8",
            "M18.4 5.6c-3.6 3.6-3.6 9.2 0 12.8",
        ],
    },
    baseball: {
        viewBox: "0 0 24 24",
        paths: [
            "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
            "M6 4.6c3.2 4 3.2 10.8 0 14.8",
            "M18 4.6c-3.2 4-3.2 10.8 0 14.8",
        ],
    },
    soccer: {
        viewBox: "0 0 24 24",
        paths: [
            "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
            "M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4L12 7.5Z",
            "M12 3v4.5",
            "M3.5 9.6l4.6 1.6",
            "M20.5 9.6l-4.6 1.6",
            "M7 19.4l2.9-4.9",
            "M17 19.4l-2.9-4.9",
        ],
    },
    football: {
        viewBox: "0 0 24 24",
        paths: [
            "M4.2 8.4c2.4-3 6.4-4.6 11.2-4.4l4.4 4.4c.2 4.8-1.4 8.8-4.4 11.2L4.2 8.4Z",
            "M4.2 8.4c3.2 1.4 6.6 4.8 8 8",
            "M9.6 11.4l2.2-2.2",
            "M12 13.8l2.2-2.2",
            "M14.4 16.2l2.2-2.2",
        ],
    },
    tennis: {
        viewBox: "0 0 24 24",
        paths: [
            "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
            "M4.6 6.4c4 2.6 10.8 2.6 14.8 0",
            "M4.6 17.6c4-2.6 10.8-2.6 14.8 0",
        ],
    },
    ufc: {
        viewBox: "0 0 24 24",
        paths: [
            "M6.5 4.5h11a2 2 0 0 1 2 2v3.4a7.5 7.5 0 0 1-15 0V6.5a2 2 0 0 1 2-2Z",
            "M12 17.4V21",
            "M8.5 21h7",
            "M9 8.5v2.5",
            "M15 8.5v2.5",
        ],
    },
    pokemon: {
        viewBox: "0 0 24 24",
        paths: ["M3 12a9 9 0 0 1 18 0H3Z", "M3 12a9 9 0 0 0 18 0H3Z"],
        circles: [[12, 12, 3]],
    },
};

const shape = (name: string) => PATHS[name] ?? PATHS.basketball;
</script>

<template>
    <svg
        :width="size ?? 30"
        :height="size ?? 30"
        :viewBox="shape(name).viewBox"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path v-for="(d, index) in shape(name).paths" :key="index" :d="d" />
        <circle
            v-for="(c, index) in shape(name).circles ?? []"
            :key="`c-${index}`"
            :cx="c[0]"
            :cy="c[1]"
            :r="c[2]"
        />
    </svg>
</template>
