import type { Directive, DirectiveBinding } from 'vue';
import { watchEffect } from 'vue';
import { useAuthStore } from '@/store/modules/auth';

/**
 * 检查当前用户是否拥有给定权限码（任一满足即可）。
 *
 * - 未登录 → false
 * - 超管 buttons 含 '*' → 直接放行
 * - string 入参 → 精确匹配
 * - string[] 入参 → some 关系（任一匹配即通过）
 */
function checkPermission(binding: DirectiveBinding<string | string[]>): boolean {
  const { isLogin, userInfo } = useAuthStore();
  if (!isLogin) return false;

  const buttons = userInfo.buttons || [];
  if (buttons.includes('*')) return true;

  const { value } = binding;
  if (!value) return false;

  return Array.isArray(value) ? value.some(code => buttons.includes(code)) : buttons.includes(value);
}

// 每个挂载了 v-permission 的元素对应一个 watchEffect stop 函数，卸载时清理
const cleanups = new WeakMap<HTMLElement, () => void>();

/**
 * v-permission="'code'" 或 v-permission="['code1', 'code2']"
 *
 * 实现要点：
 * - 用 watchEffect：响应 buttons 异步加载（登录后 getUserInfo 完成时自动更新显隐）
 *   指令自身的 updated 钩子只在元素 vNode 变化时触发，外部 reactive 变化不会触发，
 *   所以必须用 watchEffect 显式订阅 userInfo.buttons
 * - 用 display:none 而非 removeChild：vNode 仍留在 slot 数组中，避免触发 Vue slot fallback
 *   （Vue 在 slot 子节点全为注释/空时渲染 fallback；display:none 的真实元素不算空）
 *
 * 注意：指令仅控制显隐，**不能替代后端权限校验**。前端控制只是 UX 优化，
 * 接口侧必须独立做权限判断。
 */
export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const stop = watchEffect(() => {
      el.style.display = checkPermission(binding) ? '' : 'none';
    });
    cleanups.set(el, stop);
  },
  unmounted(el) {
    cleanups.get(el)?.();
    cleanups.delete(el);
  }
};
