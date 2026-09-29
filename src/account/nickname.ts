/**
 * 昵称规则。
 *
 * 后端 `functions/api/[[path]].js` 的 `nicknameProblem()` 是同一套规则，
 * 改这里必须同步改那边 —— 两边不一致会出现「前端说可以、后端拒绝」的尴尬。
 *
 * 长度按字符数算（`Array.from`），否则一个中文字会被 `length` 算成两个。
 */

/** 与后端 MIN_NICKNAME_LENGTH 保持一致 */
export const MIN_NICKNAME_LENGTH = 2;
/** 与后端 MAX_NICKNAME_LENGTH 保持一致 */
export const MAX_NICKNAME_LENGTH = 16;

/** 文字、数字、下划线、连字符，词之间可以有单个空格 */
const NICKNAME_PATTERN = /^[\p{L}\p{N}_-]+(?: [\p{L}\p{N}_-]+)*$/u;

/**
 * 去掉首尾空白，中间连续空白压成一个空格。
 * 唯一性判断才不会因为「多个空格」放过一个视觉上完全一样的昵称。
 */
export const normalizeNickname = (value: string): string => value.trim().replace(/\s+/gu, " ");

/** 返回中文问题描述；通过时返回空字符串 */
export const nicknameProblem = (value: string): string => {
    const name = normalizeNickname(value);
    const length = Array.from(name).length;
    if (length < MIN_NICKNAME_LENGTH) return `昵称至少 ${MIN_NICKNAME_LENGTH} 个字`;
    if (length > MAX_NICKNAME_LENGTH) return `昵称最多 ${MAX_NICKNAME_LENGTH} 个字`;
    if (!NICKNAME_PATTERN.test(name)) return "昵称只能使用文字、数字、空格、下划线与连字符";
    return "";
};
