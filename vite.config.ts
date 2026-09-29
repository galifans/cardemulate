import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            // 不用 node:url，省掉一份 @types/node 依赖
            "@": new URL("./src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
        },
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        chunkSizeWarningLimit: 900,
    },
    server: {
        port: 5174,
        host: "127.0.0.1",
    },
});
