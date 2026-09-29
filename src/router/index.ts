import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/",
        name: "home",
        component: () => import("../views/HomeView.vue"),
        meta: { title: "CardEmulate · 电子卡牌拆包模拟器" },
    },
    {
        path: "/c/:category",
        name: "category",
        component: () => import("../views/CategoryView.vue"),
    },
    {
        path: "/c/:category/:maker",
        name: "maker",
        component: () => import("../views/MakerView.vue"),
    },
    {
        path: "/c/:category/:maker/:product",
        name: "product",
        component: () => import("../views/ProductView.vue"),
    },
    {
        path: "/open/:boxKey",
        name: "break",
        component: () => import("../views/BreakView.vue"),
    },
    {
        path: "/stats",
        name: "stats",
        component: () => import("../views/StatsView.vue"),
    },
    {
        path: "/auth",
        name: "auth",
        component: () => import("../views/AuthView.vue"),
    },
    {
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: () => import("../views/NotFoundView.vue"),
    },
];

export const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
    const base = "CardEmulate";
    const title = to.meta?.title as string | undefined;
    document.title = title ?? `${base} · 电子卡牌拆包模拟器`;
});
