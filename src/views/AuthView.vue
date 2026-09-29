<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAppStore } from "../stores/app";

const store = useAppStore();
const router = useRouter();

const mode = ref<"login" | "register">("login");
const email = ref("");
const password = ref("");
const confirm = ref("");
const localError = ref("");

/** 与后端 MIN_PASSWORD_LENGTH / MAX_PASSWORD_LENGTH 保持一致（常见站点约束） */
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 32;

onMounted(() => {
    store.clearMessages();
});

const isRegister = computed(() => mode.value === "register");

/**
 * 大写锁定只能从键盘事件里读（浏览器没有别的途径），且必须用户先敲一下键才知道。
 * 这里在按下与松开时都读一次：Caps Lock 键自身的 keydown 里拿到的已经是切换后的状态，
 * 所以关闭大写也能被及时反映出来。
 */
const capsOn = ref(false);

const syncCaps = (event: KeyboardEvent): void => {
    capsOn.value = event.getModifierState?.("CapsLock") ?? false;
};

/** 失焦后收起提示，避免它跟着用户跑到别的输入框下面 */
const dropCaps = (): void => {
    capsOn.value = false;
};

/**
 * 密码可见：按住显示、松开恢复圆点。
 * 同时支持鼠标、触屏与键盘（空格 / 回车），键盘用户不必一直按着鼠标。
 */
const revealed = ref<"password" | "confirm" | null>(null);

const revealOn = (field: "password" | "confirm"): void => {
    revealed.value = field;
};

const revealOff = (): void => {
    revealed.value = null;
};

const isRevealed = (field: "password" | "confirm"): boolean => revealed.value === field;

const switchMode = (next: "login" | "register"): void => {
    mode.value = next;
    localError.value = "";
    revealed.value = null;
    capsOn.value = false;
    store.clearMessages();
};

const submit = async (): Promise<void> => {
    localError.value = "";
    store.clearMessages();

    const account = email.value.trim();
    if (!account) {
        localError.value = "请输入邮箱。";
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(account)) {
        localError.value = "邮箱格式不正确。";
        return;
    }
    if (!password.value) {
        localError.value = "请输入密码。";
        return;
    }
    if (isRegister.value) {
        if (password.value.length < MIN_PASSWORD) {
            localError.value = `密码至少 ${MIN_PASSWORD} 位。`;
            return;
        }
        if (password.value.length > MAX_PASSWORD) {
            localError.value = `密码最多 ${MAX_PASSWORD} 位。`;
            return;
        }
        if (/\s/.test(password.value)) {
            localError.value = "密码不能包含空格。";
            return;
        }
        if (password.value !== confirm.value) {
            localError.value = "两次输入的密码不一致。";
            return;
        }
    }

    const ok = isRegister.value
        ? await store.register(account, password.value)
        : await store.login(account, password.value);

    if (ok) {
        password.value = "";
        confirm.value = "";
        revealed.value = null;
        capsOn.value = false;
        await router.push("/stats");
        return;
    }

    // 邮箱已注册时直接切到登录页，省得用户自己去找入口
    if (isRegister.value && store.state.error.includes("已注册")) {
        mode.value = "login";
    }
};

const logout = async (): Promise<void> => {
    await store.logout();
};
</script>

<template>
    <div class="ce-shell ce-auth-shell">
        <section v-if="store.state.user" class="ce-card ce-auth-card">
            <p class="ce-card-en">Signed In</p>
            <h1 class="ce-auth-title">已登录</h1>
            <p class="ce-auth-desc">
                <strong>{{ store.state.user.displayName }}</strong>
                <br />
                <span class="ce-faint">{{ store.state.user.email }}</span>
            </p>
            <p v-if="store.state.info" class="ce-alert ce-alert-ok">{{ store.state.info }}</p>
            <div class="ce-auth-actions">
                <RouterLink class="ce-btn ce-btn-primary" to="/stats">查看我的统计</RouterLink>
                <button class="ce-btn" type="button" @click="logout">退出登录</button>
            </div>
        </section>

        <section v-else class="ce-card ce-auth-card">
            <h1 class="ce-auth-title">{{ isRegister ? "注册" : "登录" }}</h1>

            <div class="ce-auth-tabs">
                <button
                    type="button"
                    :class="{ active: !isRegister }"
                    @click="switchMode('login')"
                >
                    登录
                </button>
                <button
                    type="button"
                    :class="{ active: isRegister }"
                    @click="switchMode('register')"
                >
                    注册
                </button>
            </div>

            <form class="ce-auth-form" @submit.prevent="submit">
                <label class="ce-field">
                    <span>邮箱</span>
                    <input
                        v-model="email"
                        type="text"
                        inputmode="email"
                        autocomplete="email"
                        maxlength="100"
                        placeholder="you@example.com"
                    />
                </label>

                <label class="ce-field">
                    <span>密码</span>
                    <span class="ce-pw">
                        <!--
                            眼睛按钮就贴在输入框里，得给输入框一个明确的 aria-label：
                            否则读屏软件会把按钮的文字一起念成「密码 按住显示密码」。
                        -->
                        <input
                            v-model="password"
                            :type="isRevealed('password') ? 'text' : 'password'"
                            :autocomplete="isRegister ? 'new-password' : 'current-password'"
                            aria-label="密码"
                            :placeholder="isRegister ? `${MIN_PASSWORD}~${MAX_PASSWORD} 位字符` : '请输入密码'"
                            @keydown="syncCaps"
                            @keyup="syncCaps"
                            @blur="dropCaps"
                        />
                        <button
                            class="ce-pw-eye"
                            :class="{ on: isRevealed('password') }"
                            type="button"
                            aria-label="按住显示密码"
                            :aria-pressed="isRevealed('password')"
                            @mousedown.prevent="revealOn('password')"
                            @mouseup="revealOff"
                            @mouseleave="revealOff"
                            @touchstart.prevent="revealOn('password')"
                            @touchend="revealOff"
                            @touchcancel="revealOff"
                            @keydown.space.prevent="revealOn('password')"
                            @keyup.space="revealOff"
                            @keydown.enter.prevent="revealOn('password')"
                            @keyup.enter="revealOff"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    d="M1.5 12S5.5 5.5 12 5.5 22.5 12 22.5 12 18.5 18.5 12 18.5 1.5 12 1.5 12Z"
                                />
                                <circle cx="12" cy="12" r="3.4" />
                            </svg>
                        </button>
                    </span>
                </label>

                <p v-if="capsOn" class="ce-caps">大写锁定已打开。</p>

                <label v-if="isRegister" class="ce-field">
                    <span>确认密码</span>
                    <span class="ce-pw">
                        <input
                            v-model="confirm"
                            :type="isRevealed('confirm') ? 'text' : 'password'"
                            autocomplete="new-password"
                            aria-label="确认密码"
                            placeholder="再输入一次"
                            @keydown="syncCaps"
                            @keyup="syncCaps"
                            @blur="dropCaps"
                        />
                        <button
                            class="ce-pw-eye"
                            :class="{ on: isRevealed('confirm') }"
                            type="button"
                            aria-label="按住显示密码"
                            :aria-pressed="isRevealed('confirm')"
                            @mousedown.prevent="revealOn('confirm')"
                            @mouseup="revealOff"
                            @mouseleave="revealOff"
                            @touchstart.prevent="revealOn('confirm')"
                            @touchend="revealOff"
                            @touchcancel="revealOff"
                            @keydown.space.prevent="revealOn('confirm')"
                            @keyup.space="revealOff"
                            @keydown.enter.prevent="revealOn('confirm')"
                            @keyup.enter="revealOff"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    d="M1.5 12S5.5 5.5 12 5.5 22.5 12 22.5 12 18.5 18.5 12 18.5 1.5 12 1.5 12Z"
                                />
                                <circle cx="12" cy="12" r="3.4" />
                            </svg>
                        </button>
                    </span>
                </label>

                <p v-if="isRegister" class="ce-faint ce-auth-rule">
                    密码 {{ MIN_PASSWORD }}~{{ MAX_PASSWORD }} 位，不能包含空格。
                </p>

                <p v-if="localError" class="ce-alert ce-alert-error">{{ localError }}</p>
                <p v-else-if="store.state.error" class="ce-alert ce-alert-error">
                    {{ store.state.error }}
                </p>
                <p v-else-if="store.state.info" class="ce-alert ce-alert-ok">
                    {{ store.state.info }}
                </p>

                <button
                    class="ce-btn ce-btn-primary ce-auth-submit"
                    type="submit"
                    :disabled="store.state.busy"
                >
                    {{ store.state.busy ? "处理中…" : isRegister ? "注册" : "登录" }}
                </button>
            </form>

            <p class="ce-faint ce-auth-note">
                <template v-if="isRegister">
                    已有账号？<button class="ce-link" type="button" @click="switchMode('login')">直接登录</button>
                </template>
                <template v-else>
                    还没有账号？<button class="ce-link" type="button" @click="switchMode('register')">立即注册</button>
                </template>
            </p>
        </section>
    </div>
</template>

<style scoped>
.ce-auth-shell {
    display: flex;
    justify-content: center;
    padding-top: 40px;
}

.ce-auth-card {
    width: 100%;
    max-width: 460px;
}

.ce-auth-card p {
    margin: 0;
}

.ce-auth-title {
    font-size: 24px;
}

.ce-auth-desc {
    color: var(--ce-text-dim);
    font-size: 13.5px;
    margin-top: 10px !important;
}

.ce-auth-rule {
    font-size: 11.5px;
    margin-top: -2px !important;
}

/* 密码可见：按住图标看明文，松开立刻回到圆点 */
.ce-field .ce-pw {
    position: relative;
    margin-bottom: 0;
}

.ce-field .ce-pw input {
    padding-right: 42px;
}

.ce-pw-eye {
    position: absolute;
    top: 50%;
    right: 5px;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ce-text-dim);
    touch-action: manipulation;
    user-select: none;
}

.ce-pw-eye svg {
    width: 19px;
    height: 19px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linejoin: round;
}

.ce-pw-eye:hover {
    color: var(--ce-text);
    background: rgba(255, 255, 255, 0.07);
}

.ce-pw-eye.on {
    color: var(--ce-brand);
    background: var(--ce-brand-soft);
}

.ce-caps {
    margin-top: -8px !important;
    font-size: 12px;
    color: var(--ce-warn);
}

.ce-link {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    color: var(--ce-brand);
    text-decoration: underline;
    cursor: pointer;
}

.ce-auth-tabs {
    display: flex;
    gap: 6px;
    margin: 20px 0 18px;
    padding: 4px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--ce-border-soft);
}

.ce-auth-tabs button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ce-text-dim);
    font-size: 13.5px;
}

.ce-auth-tabs button.active {
    background: var(--ce-brand-soft);
    color: var(--ce-brand);
    font-weight: 600;
}

.ce-auth-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.ce-auth-submit {
    justify-content: center;
    margin-top: 4px;
}

.ce-auth-note {
    margin-top: 18px !important;
    font-size: 12.5px;
}

.ce-auth-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
}
</style>
